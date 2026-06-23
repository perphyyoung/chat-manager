import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import DropdownMenu from "./DropdownMenu.vue";

const items = [
  { value: "createdAt", label: "创建时间" },
  { value: "updatedAt", label: "更新时间" },
  { value: "title", label: "名称" },
];

function createWrapper(
  props: Partial<{
    items: typeof items;
    activeValue?: string;
  }> = {},
) {
  return mount(DropdownMenu, {
    props: {
      items,
      ...props,
    },
    attachTo: document.body,
  });
}

describe("DropdownMenu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should not render when closed", () => {
    const wrapper = createWrapper();
    expect(wrapper.vm.isOpen).toBe(false);
  });

  it("should open when toggle called with event", async () => {
    const wrapper = createWrapper();
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);

    expect(wrapper.vm.isOpen).toBe(true);
    expect(wrapper.vm.triggerRect).not.toBeNull();
  });

  it("should render all items with correct labels", async () => {
    const wrapper = createWrapper();
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);
    await wrapper.vm.$nextTick();

    const itemButtons = document.querySelectorAll(".dropdown-menu-item");
    expect(itemButtons.length).toBe(3);
    expect(itemButtons[0]?.textContent?.trim()).toBe("创建时间");
    expect(itemButtons[1]?.textContent?.trim()).toBe("更新时间");
    expect(itemButtons[2]?.textContent?.trim()).toBe("名称");
  });

  it("should mark active item", async () => {
    const wrapper = createWrapper({ activeValue: "updatedAt" });
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);
    await wrapper.vm.$nextTick();

    const itemEls = document.querySelectorAll(".dropdown-menu-item");
    expect(itemEls[1]?.classList.contains("active")).toBe(true);
    expect(itemEls[0]?.classList.contains("active")).toBe(false);
  });

  it("should emit select and close when item clicked", async () => {
    const wrapper = createWrapper();
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);
    await wrapper.vm.$nextTick();

    const firstItem = document.querySelector(".dropdown-menu-item") as HTMLElement;
    await firstItem.click();

    const emitted = wrapper.emitted();
    expect(emitted["select"]).toHaveLength(1);
    expect(emitted["select"]![0]).toEqual(["createdAt"]);
    expect(wrapper.vm.isOpen).toBe(false);
  });

  it("should close when overlay clicked", async () => {
    const wrapper = createWrapper();
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);
    await wrapper.vm.$nextTick();

    const overlay = document.querySelector(".dropdown-overlay") as HTMLElement;
    await overlay.click();

    expect(wrapper.emitted()["select"]).toBeUndefined();
    expect(wrapper.vm.isOpen).toBe(false);
  });

  it("should close via close method", async () => {
    const wrapper = createWrapper();
    const button = document.createElement("button");
    document.body.appendChild(button);

    wrapper.vm.toggle({ currentTarget: button } as unknown as MouseEvent);
    expect(wrapper.vm.isOpen).toBe(true);

    wrapper.vm.close();
    expect(wrapper.vm.isOpen).toBe(false);
  });

  it("should expose isOpen, toggle, close via defineExpose", () => {
    const wrapper = createWrapper();
    expect(typeof wrapper.vm.toggle).toBe("function");
    expect(typeof wrapper.vm.close).toBe("function");
    expect(typeof wrapper.vm.isOpen).toBe("boolean");
    expect(typeof wrapper.vm.triggerRect).toBe("object");
  });
});
