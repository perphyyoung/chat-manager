# Playwright 使用经验

本项目用 Playwright e2e 驱动桌面应用（Tauri 或 Electron）。运行方式、测试缝、
失败排查见对应测试文档；本文记录**与具体业务无关的 Playwright 使用经验与坑**，
重点是把「跑真实应用 + 真实数据库」的多文件并发跑稳。

## 一、fixture scope：只有 test / worker，没有 file 级

Playwright 的 fixture 只有 `test` 和 `worker` 两级 scope，**没有 file 级**（官方明确）。
而一个 worker 会**顺序执行多个 spec 文件**——若按常规做法在 worker 级 spawn 被测应用，
多个文件就会共用同一个进程和同一份数据。

对「跑真实应用 + 真实数据库」的 e2e 来说这是致命的：fixture 只 reload UI，**不清库**，
上一个文件造的数据会留到下一个文件。表现与并行度无关，`workers: 1` 时反而必现。

### 自实现 file 级实例隔离

实例是自己 spawn 的，数据目录也是自己定的，所以在 fixture 里按 `testInfo.file` 切换即可：

```ts
// worker 级：持有实例池，文件切换时关旧起新
_appPool: [
  async ({}, use, workerInfo) => {
    let seq = 0;
    // 用对象包一层：闭包内改写属性，TS 不会把闭包外的读取窄化成 null（见第五节）
    const state: { current: { file: string; app: AppHandle } | null } = { current: null };
    await use({
      async acquire(file) {
        if (state.current?.file === file) return state.current.app;
        if (state.current) await disposeApp(state.current.app); // 关进程 + 删数据目录
        const app = await launchApp(workerInfo.workerIndex, seq++);
        bindDiagnostics(app);
        state.current = { file, app };
        return app;
      },
    });
    if (state.current) await disposeApp(state.current.app); // worker teardown 兜底
  },
  { scope: "worker" },
],
// test 级：按文件取实例
app: [
  async ({ _appPool }, use, testInfo) => {
    await use(await _appPool.acquire(testInfo.file));
  },
  { scope: "test", timeout: 30_000 }, // 见第二节
],
```

要点：

- **目录/端口按 `workerIndex + 本 worker 内实例序号` 命名**（`temp/e2e-w0-1`），
  日志前缀同步带序号（`[E2E w0-1]`），排查时才能分清同一 worker 的多个文件实例。
- 旧实例在切文件时**立即关闭并删目录**，因此同时存活的实例数 ≈ worker 数，资源占用不变，
  代价只是每文件一次启动（约 2–4s）。
- **实例目录名与传给应用的实例标识必须一致**：Tauri 用 `PAIM_DATA_DIR` 传目录本身；
  Electron 用同名环境变量（如 `E2E_INSTANCE`）决定内部目录。两次命名若一个 `i++` 前一个
  后（`seq++` vs `seq`），删除时会对不上真实目录，导致测试目录删不掉。**两个值要从同一个
  变量取。**

## 二、给 fixture 单独设 timeout：启动耗时不要算进用例

被测应用冷启动（spawn + CDP 就绪）典型 2–4s。如果由用例承担，10s 的用例超时很容易被挤爆，
尤其 file 级隔离后**每个文件的首个用例**都要等启动。

解法是给 test 级 fixture 单独设 `timeout`——这段时间**不计入用例自身的超时**：

```ts
app: [async ({ _appPool }, use, testInfo) => { ... }, { scope: "test", timeout: 30_000 }],
```

## 三、共享实例下的数据唯一化

隔离只解决「跨文件」，**同一文件内的多个用例仍共用实例与数据库**。凡是会被后端按内容去重
的素材（图像按 md5），每次使用前都要重新生成一份唯一内容。

判据：**用例断言依赖「我自己刚造的那条数据」时，素材与内容都要唯一**（内容里带 `Date.now()`
就是这个目的）。需要「同内容」语义的用例则反过来——依赖「上传后不再覆写」。

**共享库下固定标题是坑**：文件内多个用例若 `beforeEach` 都 `createDocument` 同一固定标题，会
累积出多份同名文档。多数断言（"有结果"）扛得住，但语义不干净。**改成每个用例 unique 标题**
（`generateUniqueDocTitle("前缀")`），消掉累积，且多数场景只需 `createDocument(unique)` 即可。

## 四、等待策略：不要等 UI 自己结束

| 场景 | 反例 | 正解 |
| --- | --- | --- |
| toast | `expect(toast).toBeHidden()` 等它自动消失（success 2.5s / warning 4s，点多处就是几十秒） | **点击关闭**：断言可见 → 点本体（组件 `@click` 已支持）→ 等出场动画 300ms。停留时长这类组件行为交给专项用例覆盖 |
| 弹窗关闭 | `waitForTimeout` 固定等待 | 断言弹窗内输入框 `toBeHidden`（真实信号） |
| 异步 invoke 结果 | 立刻点「确定」 | 等结果在 UI 上出现（如预览列表出现文件名），否则命令还没返回就提交了空数据——这是 flaky 的常见来源 |

固定等待只在**等待时长本身是被测行为**时才用，并要在注释里写明理由。

## 五、TypeScript：闭包里赋值的变量会被窄化成 never

worker fixture 里 `let current: T | null = null` 在闭包内赋值，闭包外读取时 TS 认为它仍是
初始的 `null`，`if (current)` 之后被窄化成 `never`：

``` log
error TS2339: Property 'app' does not exist on type 'never'.
```

解法：用对象属性包一层（`const state = { current: ... }`），属性赋值不参与控制流窄化。

**两个泛型参数**：worker-scoped fixture 要用 `base.extend<TestFixtures, WorkerFixtures>` 的
**第二泛型**声明，否则 TS 把所有 fixture 按 test scope 推断，报
`'"worker"' is not assignable to type '"test"'`。test 级与 worker 级 fixture 类型分开声明。

## 六、复位与崩溃恢复

- **用例间复位**：文件级共享实例下，上一用例可能残留打开的弹窗/覆盖层。统一在 fixture 里
  `reload` 复位，用例内不要自行 reload；**每个文件的首个用例跳过 reload**——全新实例无残留，
  且 reload 会打断初始加载的 IPC 请求（`ERR_ABORTED` + 回调失联）导致后续 invoke 挂起。
- **用 needsReset 传递「是否首用例」**：实例池 `acquire` 命中已有实例即「非首用例」→ 置
  `needsReset: true`（首用例必然走新建分支，不会进入命中分支），页面 fixture 据此 `reload`。
- **reload 要有超时与兜底**：给 8s（小于用例超时），失败先记 `[diag]` 再走 reload → goto 恢复。
  否则「页面失联」会伪装成「某个按钮等不到」，排查方向全错。
- **crash 事件不可全信**：多实例高负载下 WebView 可能**销毁并重建页面**，此时不触发 `crash`
  事件，只能表现为页面无响应 → 靠上面的 reload 超时兜底暴露。
- **全量失败先单跑失败文件**：单跑通过 → 判定并行环境偶发，**不算回归、不追查、不改代码**；
  单跑也失败 → 真失败，按诊断行定位。

## 七、定位与断言

- 语义属性优先（`getByRole` / `getByPlaceholder` / `getByTitle`），**禁 CSS/XPath 选择器优先**。
- 卡片上盖着文字覆盖层时，**点文字层**而不是 `<img>`——点 img 会被命中目标检查拦下并重试到超时。
- 同一文案可能有多条，断言一律 `.first()`，否则严格模式冲突；已封装进 helper 的场景不要重复写。
- 只有第 2 处用到的样板才下沉到 helper；**helper 里只做前置校验断言，不替 spec 做被测行为断言**。

## 八、测试配置的并发相关

- **workers 数受 CI 环境变量影响**：很多配置写成 `workers: process.env.CI ? 2 : 4`。
  若在沙箱/CI 里跑（`CI=1` 被注入），实际只有 2 worker，本地终端则 4。**看到并发数与预期不符，
  先检查 `CI`。/`fullyParallel:false` 保证同一文件串行共享实例（file 级依赖它）。**

## 九、把用例标题写进日志：让日志能按用例切段

多 worker、多文件实例的日志是**按时间交错**的：前缀只说明「是谁」，看不出「哪个用例」，
失败时只能靠时间戳反推。把用例标题与结果也写进日志，日志就自带分节：

- 用 test 级 **auto** fixture 自动记录，**spec 侧零改动**；
- **Node 侧直写**（复用日志文件通道），不经过页面，页面挂了照样记；
- 开始记 `▶`，结束记 `✓ 通过 <耗时>` / `✗ <status> <耗时> — <errors[0] 首行>`。

```log
14:33:33.744 [TEST] [E2E w1] ▶ 02 › 新建提示词后，新卡片应置顶显示
14:36:01.011 [TEST] [E2E w1] ✓ 通过 3.8s 02 › 新建提示词后，新卡片应置顶显示
```

三个要点：

- agent 号显式传 `testInfo.workerIndex`，不要复用业务日志的实例 tag——标题记录发生在实例启动
  **之前**（auto fixture 无依赖，先于 app fixture setup），复用到上一个实例或为空。
- 级别跟业务日志同一个开关；跑全量嫌噪声多时临时调高阈值重跑，分节行随之消失，只剩异常信号。
- 标题取 `testInfo.titlePath`：`[0]` 是文件路径，`slice(1)` 之后是 describe 链路 + 用例标题，
  join 起来就是 `文件 › 用例`——比只用 `title` 多了分组信息，也不用自己拼文件名。

## 十、应用单实例锁：多实例并发必须先按实例隔离开锁用的路径

很多桌面应用启用单实例锁（Electron 的 `app.requestSingleInstanceLock()`，Tauri v2 自带的
`tauri-plugin-single-instance`），锁默认按应用的数据目录/权限资源注册。多 worker 并发 spawn
同一入口时，若**数据目录未隔离**：

- 后启动实例拿不到锁 → 直接退出 → 启动失败（如 Playwright 报 `Target page closed`）；
- 已有实例收到 second-instance 事件，常在其回调里再开新窗口 → **窗口数不受控**，
  出现「多于 worker 数的窗口」。

对策：**E2E 时按实例隔离数据/权限目录，且须在应用注册单实例锁之前设置**。Electron：

```ts
// 在 requestSingleInstanceLock() 之前
if (process.env.E2E === "1" && process.env.E2E_INSTANCE) {
  app.setPath("userData", path.join(dataDir, "_userData")); // dataDir = temp/e2e/{E2E_INSTANCE}
}
```

Tauri 同理：让每实例用独立的数据目录/资源标识（如给 `plugin-single-instance` 传入按实例区分的
标识），使各实例锁互不冲突。

隔离后各实例锁独立，每个实例稳定一个窗口，窗口数 = worker 数。

## 十一、无法在受限环境跑 e2e 时怎么自测基础设施

e2e 需要先构建被测 app，在受限环境里跑不起来；但**日志这类纯 Node 侧的基础设施可以隔离
冒烟**：把日志模块连同一个小 `.ts` 脚本拷到 `temp/` 子目录再跑——日志路径随之落在 `temp/` 下，
**不污染真正的日志**：

```bash
mkdir -p temp/logger-smoke && cp e2e/e2e-logger.ts temp/logger-smoke/
node temp/logger-smoke/smoke.ts
```

两种阈值都验一遍，跑完删目录。判据：**被测的东西不依赖浏览器/应用进程时，就不要为了验证它
去启动整套环境。**
