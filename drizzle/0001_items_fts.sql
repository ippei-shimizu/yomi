-- メモ全文検索（Pro）用の FTS5 インデックス。docs/DesignDoc.md §4.3
--
-- tokenize='trigram' を使う。既定の unicode61 は連続する日本語を 1 トークンに
-- するため、「Solid Queueのasyncモード」に対して「モード」が引けない。
-- trigram なら部分一致が効く（ただし 3 文字未満のクエリは扱えないため、
-- 呼び出し側が LIKE にフォールバックする）。
--
-- content='items' の外部コンテンツテーブルにして、本文の二重保持を避ける。
CREATE VIRTUAL TABLE `items_fts` USING fts5(
  `title`,
  `memo`,
  `description`,
  content=`items`,
  content_rowid=`rowid`,
  tokenize='trigram'
);
--> statement-breakpoint
-- 既存行のバックフィル
INSERT INTO `items_fts`(`rowid`, `title`, `memo`, `description`)
  SELECT `rowid`, `title`, `memo`, `description` FROM `items`;
--> statement-breakpoint
CREATE TRIGGER `items_fts_insert` AFTER INSERT ON `items` BEGIN
  INSERT INTO `items_fts`(`rowid`, `title`, `memo`, `description`)
    VALUES (new.`rowid`, new.`title`, new.`memo`, new.`description`);
END;
--> statement-breakpoint
-- 外部コンテンツテーブルの更新は delete 命令で旧行を打ち消してから入れ直す
CREATE TRIGGER `items_fts_delete` AFTER DELETE ON `items` BEGIN
  INSERT INTO `items_fts`(`items_fts`, `rowid`, `title`, `memo`, `description`)
    VALUES ('delete', old.`rowid`, old.`title`, old.`memo`, old.`description`);
END;
--> statement-breakpoint
CREATE TRIGGER `items_fts_update` AFTER UPDATE ON `items` BEGIN
  INSERT INTO `items_fts`(`items_fts`, `rowid`, `title`, `memo`, `description`)
    VALUES ('delete', old.`rowid`, old.`title`, old.`memo`, old.`description`);
  INSERT INTO `items_fts`(`rowid`, `title`, `memo`, `description`)
    VALUES (new.`rowid`, new.`title`, new.`memo`, new.`description`);
END;
