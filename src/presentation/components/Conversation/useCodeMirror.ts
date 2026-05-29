import { ref, shallowRef, nextTick } from "vue";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { languages } from "@codemirror/language-data";
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
  getSearchQuery,
} from "@codemirror/search";

interface UseCodeMirrorOptions {
  initialContent: string;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  onContentChange?: (content: string) => void;
  onSearchUpdate?: (index: number, count: number) => void;
}

/**
 * CodeMirror 编辑器组合式函数
 * 封装编辑器的初始化、配置、状态管理和销毁逻辑
 */
export function useCodeMirror(options: UseCodeMirrorOptions) {
  const editorContainer = ref<HTMLElement | null>(null);
  const editorView = shallowRef<EditorView | null>(null);
  const showLineNumbers = ref(options.showLineNumbers ?? false);
  const wordWrap = ref(options.wordWrap ?? false);
  const searchIndex = ref(0);
  const searchCount = ref(0);
  const historyCompartment = new Compartment();

  /**
   * 更新搜索索引显示
   */
  const updateSearchDisplay = (view: EditorView) => {
    const searchPanel = view.dom.querySelector(".cm-search");
    if (!searchPanel) return;

    const query = getSearchQuery(view.state);

    if (query.search) {
      const cursor = query.getCursor(view.state);
      const matches: { from: number; to: number }[] = [];

      // 收集所有匹配位置
      let result = cursor.next();
      while (!result.done) {
        matches.push({ from: result.value.from, to: result.value.to });
        result = cursor.next();
      }

      searchCount.value = matches.length;

      if (searchCount.value > 0) {
        // 获取当前选中的位置
        const selection = view.state.selection.main;
        const cursorFrom = selection.from;
        const cursorTo = selection.to;

        // 查找当前选区对应的匹配索引
        const currentIndex = matches.findIndex(
          (match) => match.from === cursorFrom && match.to === cursorTo,
        );

        // 如果没精确匹配，尝试只匹配 from 位置（考虑边界情况）
        if (currentIndex === -1) {
          const approximateIndex = matches.findIndex(
            (match) => cursorFrom >= match.from && cursorFrom <= match.to,
          );
          searchIndex.value =
            approximateIndex !== -1 ? approximateIndex + 1 : 1;
        } else {
          searchIndex.value = currentIndex + 1;
        }
      } else {
        searchIndex.value = 0;
      }

      searchPanel.setAttribute(
        "data-search-index",
        `${searchIndex.value}/${searchCount.value}`,
      );
    } else {
      searchIndex.value = 0;
      searchCount.value = 0;
      searchPanel.removeAttribute("data-search-index");
    }

    // 触发回调
    if (options.onSearchUpdate) {
      options.onSearchUpdate(searchIndex.value, searchCount.value);
    }
  };

  /**
   * 初始化 CodeMirror 编辑器
   * @param content - 可选，指定编辑器内容，不传则使用 options.initialContent
   * @param restoreScrollTop - 可选，恢复滚动位置
   */
  const initCodeMirror = (content?: string, restoreScrollTop?: number) => {
    if (!editorContainer.value) return;

    const docContent = content ?? options.initialContent;

    editorView.value = new EditorView({
      state: EditorState.create({
        doc: docContent,
        extensions: [
          historyCompartment.of(history()), // 启用撤销/重做
          showLineNumbers.value ? lineNumbers() : [], // 显示行号（默认关闭）
          wordWrap.value ? EditorView.lineWrapping : [], // 长文本换行
          markdown({ codeLanguages: languages }),
          oneDark,
          search({ top: true }), // 官方搜索面板，显示在顶部
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          highlightSelectionMatches(), // 高亮选中的匹配
          EditorView.updateListener.of((update) => {
            if (update.docChanged && options.onContentChange) {
              options.onContentChange(update.state.doc.toString());
            }
            // 更新搜索索引显示
            updateSearchDisplay(update.view);
          }),
          // 确保编辑器可聚焦
          EditorView.contentAttributes.of({ tabindex: "0" }),
        ],
      }),
      parent: editorContainer.value,
    });

    // 通过重新配置 history 来清除初始状态之前的空历史，防止撤销时状态不匹配
    editorView.value.dispatch({
      effects: historyCompartment.reconfigure([]),
    });
    editorView.value.dispatch({
      effects: historyCompartment.reconfigure(history()),
    });

    // 确保编辑器获得焦点
    editorView.value.focus();

    // 恢复滚动位置（在 focus 之后设置，避免 focus 导致滚动位置重置）
    if (restoreScrollTop !== undefined && editorView.value) {
      editorView.value.scrollDOM.scrollTop = restoreScrollTop;
    }
  };

  /**
   * 销毁 CodeMirror 编辑器
   */
  const destroyCodeMirror = () => {
    if (editorView.value) {
      editorView.value.destroy();
      editorView.value = null;
    }
  };

  /**
   * 重新初始化编辑器（用于切换配置时）
   * 使用滚动比例而非绝对 scrollTop，避免行号显示/隐藏导致的偏移问题
   */
  const reinitializeEditor = () => {
    if (editorView.value) {
      const currentContent = editorView.value.state.doc.toString();
      const scrollDOM = editorView.value.scrollDOM;

      // 计算滚动比例（0-1之间）
      const scrollHeight = scrollDOM.scrollHeight - scrollDOM.clientHeight;
      const scrollRatio =
        scrollHeight > 0 ? scrollDOM.scrollTop / scrollHeight : 0;

      destroyCodeMirror();

      // 初始化新编辑器
      initCodeMirror(currentContent);

      // 在新编辑器上应用滚动比例
      nextTick(() => {
        if (editorView.value) {
          const newScrollDOM = editorView.value.scrollDOM;
          const newScrollHeight =
            newScrollDOM.scrollHeight - newScrollDOM.clientHeight;
          newScrollDOM.scrollTop = newScrollHeight * scrollRatio;
        }
      });
    }
  };

  /**
   * 切换行号显示
   */
  const toggleLineNumbers = () => {
    showLineNumbers.value = !showLineNumbers.value;
    reinitializeEditor();
  };

  /**
   * 切换长文本换行
   */
  const toggleWordWrap = () => {
    wordWrap.value = !wordWrap.value;
    // 长文本换行时自动开启行号
    if (wordWrap.value) {
      showLineNumbers.value = true;
    }
    reinitializeEditor();
  };

  /**
   * 获取当前编辑器内容
   */
  const getContent = () => {
    return editorView.value?.state.doc.toString() ?? "";
  };

  /**
   * 撤销操作
   */
  const undo = () => {
    if (editorView.value) {
      // 使用 CodeMirror 的撤销命令
      editorView.value.focus();
      // 通过键盘事件触发撤销
      const event = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        bubbles: true,
      });
      editorView.value.contentDOM.dispatchEvent(event);
    }
  };

  /**
   * 重做操作
   */
  const redo = () => {
    if (editorView.value) {
      // 使用 CodeMirror 的重做命令
      editorView.value.focus();
      // 通过键盘事件触发重做
      const event = new KeyboardEvent("keydown", {
        key: "y",
        ctrlKey: true,
        bubbles: true,
      });
      editorView.value.contentDOM.dispatchEvent(event);
    }
  };

  /**
   * 聚焦编辑器
   */
  const focus = () => {
    editorView.value?.focus();
  };

  return {
    editorContainer,
    editorView,
    showLineNumbers,
    wordWrap,
    searchIndex,
    searchCount,
    initCodeMirror,
    destroyCodeMirror,
    reinitializeEditor,
    toggleLineNumbers,
    toggleWordWrap,
    getContent,
    undo,
    redo,
    focus,
  };
}
