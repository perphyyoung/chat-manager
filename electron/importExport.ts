import { BrowserWindow, dialog } from "electron";
import fs from "node:fs";
import { log } from "./logger";
import { getDatabase } from "./database";
import { SearchService } from "../src/infrastructure/search/SearchService";
import type { DocRow, TagRow, QuestionRow, AnswerRow } from "../src/types/db";

export async function exportData() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;

  const result = await dialog.showSaveDialog(focusedWindow, {
    title: "导出数据",
    defaultPath: `chat-manager-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) return;

  try {
    const database = getDatabase();
    const docs = database
      .prepare("SELECT * FROM documents")
      .all() as unknown as DocRow[];
    const tags = database
      .prepare("SELECT * FROM tags")
      .all() as unknown as TagRow[];

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: docs.map((doc) => {
        const questions = database
          .prepare(
            "SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order",
          )
          .all(doc.id) as unknown as QuestionRow[];
        const answers = database
          .prepare(
            "SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)",
          )
          .all(doc.id) as unknown as AnswerRow[];
        const docTags = database
          .prepare(
            "SELECT t.* FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
          )
          .all(doc.id) as unknown as TagRow[];

        return {
          id: doc.id,
          title: doc.title,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          isDeleted: doc.is_deleted,
          deletedAt: doc.deleted_at,
          questions: questions.map((q) => ({
            id: q.id,
            text: q.text,
            order: q.sort_order,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
            isDeleted: q.is_deleted,
            deletedAt: q.deleted_at,
          })),
          answers: answers.map((a) => ({
            id: a.id,
            questionId: a.question_id,
            content: a.content,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
          })),
          tags: docTags.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: t.created_at,
          })),
        };
      }),
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      })),
    };

    fs.writeFileSync(
      result.filePath,
      JSON.stringify(exportData, null, 2),
      "utf-8",
    );
    focusedWindow.webContents.send("export-complete", {
      success: true,
      filePath: result.filePath,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "导出失败";
    focusedWindow.webContents.send("export-complete", {
      success: false,
      error: errorMsg,
    });
    log.error(
      `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function importData() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;

  const result = await dialog.showOpenDialog(focusedWindow, {
    title: "导入数据",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return;

  try {
    const fileContent = fs.readFileSync(result.filePaths[0], "utf-8");
    const importData = JSON.parse(fileContent);

    if (!importData.documents || !Array.isArray(importData.documents)) {
      throw new Error("无效的导入文件格式");
    }

    const database = getDatabase();
    const now = new Date().toISOString();
    let importedDocCount = 0;
    let importedTagCount = 0;

    // 收集所有标签名称到 ID 的映射（按名称匹配）
    const existingTags = database
      .prepare("SELECT * FROM tags")
      .all() as unknown as TagRow[];
    const tagNameToId = new Map<string, string>();
    for (const tag of existingTags) {
      tagNameToId.set(tag.name, tag.id);
    }

    // 导入标签（按名称匹配，已存在则复用）
    const allTags = importData.tags || [];
    for (const tag of allTags) {
      if (!tagNameToId.has(tag.name)) {
        database
          .prepare("INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)")
          .run(tag.id, tag.name, tag.createdAt ?? now);
        tagNameToId.set(tag.name, tag.id);
        importedTagCount++;
      }
    }

    // 收集所有导入文档的标题
    const importTitles = importData.documents.map(
      (doc: { title: string }) => doc.title,
    );

    // 一次性查询所有已存在的文档标题
    const placeholders = importTitles.map(() => "?").join(",");
    const existingDocs = database
      .prepare(`SELECT title FROM documents WHERE title IN (${placeholders})`)
      .all(...importTitles) as Array<{ title: string }>;
    const existingTitleSet = new Set(existingDocs.map((d) => d.title));

    // 收集跳过的文档标题
    const skippedDocs: string[] = [];

    // 导入文档（跳过已存在的）
    for (const doc of importData.documents) {
      if (existingTitleSet.has(doc.title)) {
        skippedDocs.push(doc.title);
        continue; // 跳过已存在的文档
      }

      const newDocId = crypto.randomUUID();
      database
        .prepare(
          "INSERT INTO documents (id, title, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          newDocId,
          doc.title,
          doc.createdAt ?? now,
          doc.updatedAt ?? now,
          doc.isDeleted ? 1 : 0,
          doc.deletedAt ?? null,
        );

      // 导入问题
      const questionIdMap = new Map<string, string>(); // 旧 ID -> 新 ID
      if (doc.questions) {
        for (const q of doc.questions) {
          const newQuestionId = crypto.randomUUID();
          questionIdMap.set(q.id, newQuestionId);
          database
            .prepare(
              "INSERT INTO questions (id, document_id, text, sort_order, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              newQuestionId,
              newDocId,
              q.text,
              q.order,
              q.createdAt ?? now,
              q.updatedAt ?? now,
              q.isDeleted ? 1 : 0,
              q.deletedAt ?? null,
            );
        }
      }

      // 导入答案
      if (doc.answers) {
        for (const a of doc.answers) {
          const newQuestionId = questionIdMap.get(a.questionId);
          if (newQuestionId) {
            database
              .prepare(
                "INSERT INTO answers (id, question_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
              )
              .run(
                crypto.randomUUID(),
                newQuestionId,
                a.content,
                a.createdAt ?? now,
                a.updatedAt ?? now,
              );
          }
        }
      }

      // 导入文档标签关联
      if (doc.tags) {
        for (const tag of doc.tags) {
          const tagId = tagNameToId.get(tag.name);
          if (tagId) {
            database
              .prepare(
                "INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
              )
              .run(newDocId, tagId);
          }
        }
      }

      importedDocCount++;
    }

    await SearchService.rebuildIndex(getDatabase());
    focusedWindow.webContents.send("import-complete", {
      success: true,
      importedDocCount,
      importedTagCount,
      skippedDocs,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "导入失败";
    focusedWindow.webContents.send("import-complete", {
      success: false,
      error: errorMsg,
    });
    log.error(
      `Import failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
