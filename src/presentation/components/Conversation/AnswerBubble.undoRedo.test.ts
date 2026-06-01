import { describe, it, expect, beforeEach } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { history, undo, redo } from "@codemirror/commands";

function mockDOMRect(): DOMRect {
  const rec = {
    x: 0,
    y: 0,
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  };
  return { ...rec, toJSON: () => rec } as DOMRect;
}

class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
  item(index: number): DOMRect | null {
    return this[index] ?? null;
  }
}

function setupDOMMocks(): void {
  document.elementFromPoint = (): null => null;
  HTMLElement.prototype.getBoundingClientRect = mockDOMRect;
  HTMLElement.prototype.getClientRects = (): DOMRectList =>
    new FakeDOMRectList();
  Range.prototype.getBoundingClientRect = mockDOMRect;
  Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();
  document.createRange = () => {
    const range = new Range();
    range.getBoundingClientRect = mockDOMRect;
    range.getClientRects = (): DOMRectList => new FakeDOMRectList();
    return range;
  };
}

describe("undo/redo functionality", () => {
  beforeEach(() => {
    setupDOMMocks();
  });

  it("should undo text insertion", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    view.dispatch({
      changes: { from: 0, insert: "hello" },
    });
    expect(view.state.doc.toString()).toBe("hello");

    // Undo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    view.destroy();
  });

  it("should redo text insertion", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    view.dispatch({
      changes: { from: 0, insert: "hello" },
    });
    expect(view.state.doc.toString()).toBe("hello");

    // Undo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    // Redo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (redo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("hello");

    view.destroy();
  });

  it("should undo single change", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    view.dispatch({
      changes: { from: 0, insert: "hello world" },
    });
    expect(view.state.doc.toString()).toBe("hello world");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    view.destroy();
  });

  it("should redo after undo", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    view.dispatch({ changes: { from: 0, insert: "test" } });
    expect(view.state.doc.toString()).toBe("test");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (redo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("test");

    view.destroy();
  });

  it("should handle empty document undo gracefully", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    view.destroy();
  });

  it("should handle empty document redo gracefully", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [history()],
      }),
      parent: container,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (redo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("");

    view.destroy();
  });

  it("should undo deletion", () => {
    const container = document.createElement("div");

    const view = new EditorView({
      state: EditorState.create({
        doc: "hello world",
        extensions: [history()],
      }),
      parent: container,
    });

    view.dispatch({
      changes: { from: 5, to: 11, insert: "" },
    });
    expect(view.state.doc.toString()).toBe("hello");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (undo as (view: any) => void)(view);
    expect(view.state.doc.toString()).toBe("hello world");

    view.destroy();
  });
});
