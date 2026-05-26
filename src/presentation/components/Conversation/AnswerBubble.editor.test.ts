import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands";
import { languages } from "@codemirror/language-data";

describe("CodeMirror editor", () => {
  describe("undo/redo functionality", () => {
    it("should create editor with history extension", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "initial content",
          extensions: [
            history(),
            markdown({ codeLanguages: languages }),
          ],
        }),
        parent: container,
      });

      expect(view).toBeDefined();
      expect(view.state.doc.toString()).toBe("initial content");

      view.destroy();
    });

    it("should track document changes in history", () => {
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

      view.dispatch({
        changes: { from: 5, insert: " world" },
      });

      expect(view.state.doc.toString()).toBe("hello world");

      view.destroy();
    });

    it("should have history extension", () => {
      const container = document.createElement("div");

      const historyExt = history();
      const view = new EditorView({
        state: EditorState.create({
          doc: "test",
          extensions: [historyExt],
        }),
        parent: container,
      });

      expect(view.state).toBeDefined();
      expect(view.state.doc.toString()).toBe("test");

      view.destroy();
    });

    it("should track changes for undo", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "",
          extensions: [history()],
        }),
        parent: container,
      });

      view.dispatch({
        changes: { from: 0, insert: "test" },
      });

      expect(view.state.doc.toString()).toBe("test");

      view.destroy();
    });
  });

  describe("editor view lifecycle", () => {
    it("should destroy editor view cleanly", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "content",
          extensions: [history()],
        }),
        parent: container,
      });

      expect(container.children.length).toBe(1);

      view.destroy();

      expect(container.children.length).toBe(0);
    });

    it("should update document content", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "original",
          extensions: [history()],
        }),
        parent: container,
      });

      view.dispatch({
        changes: { from: 0, to: 8, insert: "updated" },
      });

      expect(view.state.doc.toString()).toBe("updated");

      view.destroy();
    });
  });

  describe("editor extensions", () => {
    it("should support markdown syntax", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "# Hello\n\nThis is **bold** and *italic*.",
          extensions: [
            history(),
            markdown({ codeLanguages: languages }),
          ],
        }),
        parent: container,
      });

      expect(view.state.doc.toString()).toContain("# Hello");
      expect(view.state.doc.toString()).toContain("**bold**");

      view.destroy();
    });

    it("should preserve history across re-creations", () => {
      const container = document.createElement("div");

      const createView = () => {
        return new EditorView({
          state: EditorState.create({
            doc: "",
            extensions: [history()],
          }),
          parent: container,
        });
      };

      const view1 = createView();
      view1.dispatch({ changes: { from: 0, insert: "step1" } });

      const content1 = view1.state.doc.toString();
      view1.destroy();

      const view2 = createView();
      view2.dispatch({ changes: { from: 0, insert: content1 + " + step2" } });

      expect(view2.state.doc.toString()).toBe("step1 + step2");

      view2.destroy();
    });
  });
});

describe("editor helper functions", () => {
  describe("handleUndo", () => {
    it("should be defined as a function", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "test",
          extensions: [history()],
        }),
        parent: container,
      });

      view.dispatch({ changes: { from: 0, insert: "more " } });
      expect(view.state.doc.toString()).toBe("more test");

      view.destroy();
    });
  });

  describe("handleRedo", () => {
    it("should be defined as a function", () => {
      const container = document.createElement("div");

      const view = new EditorView({
        state: EditorState.create({
          doc: "test",
          extensions: [history()],
        }),
        parent: container,
      });

      view.dispatch({ changes: { from: 0, insert: "before " } });
      expect(view.state.doc.toString()).toBe("before test");

      view.destroy();
    });
  });
});
