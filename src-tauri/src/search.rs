use std::sync::Mutex;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{Index, ReloadPolicy, TantivyDocument};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

pub struct SearchState {
    pub index: Index,
    pub reader: tantivy::IndexReader,
    pub fields: SearchFields,
}

pub struct SearchFields {
    pub id: Field,
    pub title: Field,
    pub content: Field,
}

pub struct TantivyManager {
    pub state: Mutex<Option<SearchState>>,
}

impl TantivyManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(None),
        }
    }

    /// 初始化 Tantivy 索引
    pub fn init_index(&self, index_path: PathBuf) -> Result<(), String> {
        if !index_path.exists() {
            fs::create_dir_all(&index_path).map_err(|e| e.to_string())?;
        }

        let mut schema_builder = Schema::builder();
        let id = schema_builder.add_text_field("id", STRING | STORED);
        let title = schema_builder.add_text_field("title", TEXT | STORED);
        let content = schema_builder.add_text_field("content", TEXT | STORED);
        let schema = schema_builder.build();

        let index = Index::open_or_create(tantivy::directory::MmapDirectory::open(&index_path).map_err(|e| e.to_string())?, schema.clone())
            .map_err(|e| e.to_string())?;

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::Manual)
            .try_into()
            .map_err(|e| e.to_string())?;

        let mut state = self.state.lock().unwrap();
        *state = Some(SearchState {
            index,
            reader,
            fields: SearchFields { id, title, content },
        });

        Ok(())
    }

    /// 更新或添加文档到索引
    pub fn update_index(&self, id_val: &str, title_val: &str, content_val: &str) -> Result<(), String> {
        let state_lock = self.state.lock().unwrap();
        let state = state_lock.as_ref().ok_or("Index not initialized")?;

        let mut index_writer = state.index.writer::<TantivyDocument>(50_000_000).map_err(|e| e.to_string())?;
        
        // 先删除旧文档
        let term = tantivy::Term::from_field_text(state.fields.id, id_val);
        index_writer.delete_term(term);

        // 添加新文档
        let mut doc = TantivyDocument::default();
        doc.add_text(state.fields.id, id_val);
        doc.add_text(state.fields.title, title_val);
        doc.add_text(state.fields.content, content_val);
        
        index_writer.add_document(doc).map_err(|e| e.to_string())?;
        index_writer.commit().map_err(|e| e.to_string())?;

        Ok(())
    }

    /// 搜索文档
    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
        let state_lock = self.state.lock().unwrap();
        let state = state_lock.as_ref().ok_or("Index not initialized")?;

        let searcher = state.reader.searcher();
        let query_parser = QueryParser::for_index(&state.index, vec![state.fields.title, state.fields.content]);
        let query = query_parser.parse_query(query_str).map_err(|e| e.to_string())?;

        let top_docs = searcher.search(&query, &TopDocs::with_limit(limit)).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let retrieved_doc: TantivyDocument = searcher.doc(doc_address).map_err(|e| e.to_string())?;
            
            let id = retrieved_doc.get_first(state.fields.id)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let title = retrieved_doc.get_first(state.fields.title)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let content = retrieved_doc.get_first(state.fields.content)
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // 简单的摘要提取（后续可以改进）
            let snippet = if content.len() > 200 {
                format!("{}...", &content[..200])
            } else {
                content.to_string()
            };

            results.push(SearchResult {
                id,
                title,
                snippet,
                score,
            });
        }

        Ok(results)
    }

    /// 删除索引中的文档
    pub fn delete_index(&self, id_val: &str) -> Result<(), String> {
        let state_lock = self.state.lock().unwrap();
        let state = state_lock.as_ref().ok_or("Index not initialized")?;

        let mut index_writer = state.index.writer::<TantivyDocument>(50_000_000).map_err(|e| e.to_string())?;
        let term = tantivy::Term::from_field_text(state.fields.id, id_val);
        index_writer.delete_term(term);
        index_writer.commit().map_err(|e| e.to_string())?;

        Ok(())
    }
}
