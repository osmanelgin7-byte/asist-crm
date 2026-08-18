import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../lib/session.js";

export const teamNotesRouter = Router();

teamNotesRouter.use(authenticate);

teamNotesRouter.get("/", async (_req, res) => {
  const notes = await prisma.teamNoteEntry.findMany({
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.json(
    notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    }))
  );
});

teamNotesRouter.post("/", async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) {
    res.status(400).json({ error: "Not metni boş olamaz" });
    return;
  }

  const note = await prisma.teamNoteEntry.create({
    data: { content, authorId: req.user!.id },
    include: { author: { select: { id: true, name: true } } },
  });

  res.status(201).json({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    author: note.author,
  });
});
