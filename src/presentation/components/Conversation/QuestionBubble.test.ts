import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import QuestionBubble from "./QuestionBubble.vue";

function createWrapper() {
  return mount(QuestionBubble, {
    props: {
      text: "测试问题",
      questionId: "q-1",
    },
    global: {
      provide: {
        showToast: vi.fn(),
      },
    },
    attachTo: document.body,
  });
}

function openContextMenu(wrapper: ReturnType<typeof createWrapper>) {
  const content = wrapper.find(".question-bubble__content");
  content.element.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    }),
  );
}

describe("QuestionBubble", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should render question text", () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain("测试问题");
  });

  it("should show context menu on right click", async () => {
    const wrapper = createWrapper();
    openContextMenu(wrapper);
    await nextTick();

    const items = document.querySelectorAll(".context-menu-item");
    expect(items.length).toBe(3);
    expect(items[0]?.textContent?.trim()).toBe("复制");
    expect(items[1]?.textContent?.trim()).toBe("在问题列表中显示");
    expect(items[2]?.textContent?.trim()).toBe("在文档列表中显示");
  });

  it("should emit showInList when '在问题列表中显示' clicked", async () => {
    const wrapper = createWrapper();
    openContextMenu(wrapper);
    await nextTick();

    const item = document.querySelectorAll(".context-menu-item")[1] as HTMLElement;
    await item.click();

    expect(wrapper.emitted("showInList")).toHaveLength(1);
    expect(wrapper.emitted("showInList")![0]).toEqual(["q-1"]);
  });

  it("should emit showInDocumentList when '在文档列表中显示' clicked", async () => {
    const wrapper = createWrapper();
    openContextMenu(wrapper);
    await nextTick();

    const item = document.querySelectorAll(".context-menu-item")[2] as HTMLElement;
    await item.click();

    expect(wrapper.emitted("showInDocumentList")).toHaveLength(1);
    expect(wrapper.emitted("showInDocumentList")![0]).toEqual(["q-1"]);
  });
});
