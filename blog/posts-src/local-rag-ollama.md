---
title: "RAG 本地实践：用 Ollama + Embedding 搭建私有知识库"
description: "RAG 本地实践：用 Ollama + Embedding 搭建私有知识库，实现完全离线的智能问答"
date: 2026-04-07 20:51:59
category: AI
tags: ["RAG", "Ollama", "LLM", "向量数据库", "本地部署"]
read_time: 15
slug: local-rag-ollama
---

<p>大模型虽然强大，但有两个致命弱点：<strong>知识截止</strong>和<strong>幻觉问题</strong>。RAG（Retrieval-Augmented Generation，检索增强生成）通过在回答前检索相关知识，有效解决了这两个问题。</p>

      <p>但云端 RAG 服务存在隐私风险。本文介绍如何<strong>完全本地化</strong>搭建 RAG 系统，数据不出本机，同时获得接近 GPT-4 的问答体验。</p>

      <div class="tip-box">
        <strong>核心优势</strong>：完全离线、数据私有、零 API 费用、响应速度快
      </div>

      <h2>技术架构</h2>

      <table>
        <tr><th>组件</th><th>选型</th><th>作用</th></tr>
        <tr><td>LLM</td><td>Ollama</td><td>本地运行大模型，提供生成能力</td></tr>
        <tr><td>Embedding</td><td>nomic-embed-text / mxbai-embed-large</td><td>文本向量化，用于语义检索</td></tr>
        <tr><td>向量数据库</td><td>ChromaDB / Qdrant</td><td>存储和检索向量</td></tr>
        <tr><td>框架</td><td>LangChain / LlamaIndex</td><td>编排 RAG 流程</td></tr>
      </table>

      <h2>环境准备</h2>

      <h3>1. 安装 Ollama</h3>

      <pre><code># macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型（推荐 qwen2.5:7b 中文效果好）
ollama pull qwen2.5:7b
ollama pull nomic-embed-text</code></pre>

      <h3>2. 安装依赖</h3>

      <pre><code>pip install ollama chromadb langchain langchain-ollama</code></pre>

      <h2>核心实现</h2>

      <h3>文档加载与切分</h3>

      <pre><code>from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 加载文档
loader = TextLoader("docs/my_notes.txt")
docs = loader.load()

# 切分文档（每块 500 字符，重叠 50）
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50
)
chunks = splitter.split_documents(docs)</code></pre>

      <h3>向量化与存储</h3>

      <pre><code>from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

# 初始化 Embedding 模型
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# 存入向量数据库
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)</code></pre>

      <h3>检索与生成</h3>

      <pre><code>from langchain_ollama import ChatOllama
from langchain.chains import RetrievalQA

# 初始化 LLM
llm = ChatOllama(model="qwen2.5:7b", temperature=0.7)

# 创建 RAG Chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
    return_source_documents=True
)

# 提问
result = qa_chain.invoke({"query": "我的项目用了什么技术栈？"})
print(result["result"])</code></pre>

      <h2>性能优化</h2>

      <ul>
        <li><strong>文档切分策略</strong>：按语义段落切分，避免在句子中间断开</li>
        <li><strong>重排序（Rerank）</strong>：用 cross-encoder 对检索结果重排序，提升相关性</li>
        <li><strong>混合检索</strong>：结合关键词检索（BM25）和向量检索</li>
        <li><strong>量化模型</strong>：使用 4-bit 量化模型减少显存占用</li>
      </ul>

      <h2>踩坑记录</h2>

      <div class="warning-box">
        <strong>Embedding 模型选择</strong>：nomic-embed-text 对英文效果好，中文建议用 mxbai-embed-large 或 bge-m3
      </div>

      <div class="warning-box">
        <strong>文档切分大小</strong>：chunk_size 太大导致检索不精确，太小导致上下文丢失，建议 300-500 字符
      </div>

      <div class="warning-box">
        <strong>显存不足</strong>：7B 模型需要 4-8GB 显存，可用量化版本（qwen2.5:7b-q4_K_M）
      </div>

      <h2>进阶：Web 界面</h2>

      <p>用 Streamlit 快速搭建问答界面：</p>

      <pre><code>import streamlit as st

st.title("📚 私有知识库问答")
question = st.text_input("提问")

if question:
    with st.spinner("思考中..."):
        result = qa_chain.invoke({"query": question})
    st.write(result["result"])
    
    with st.expander("参考来源"):
        for doc in result["source_documents"]:
            st.markdown(f"- {doc.page_content[:200]}...")</code></pre>

      <h2>总结</h2>

      <p>本地 RAG 方案让大模型真正"可用"：</p>

      <ul>
        <li>✅ 数据完全私有，适合敏感信息</li>
        <li>✅ 无 API 费用，长期使用成本低</li>
        <li>✅ 响应速度快，无需网络等待</li>
        <li>✅ 可定制性强，模型、参数完全可控</li>
      </ul>

      <p>对于个人知识管理、企业内部文档问答等场景，本地 RAG 是性价比最高的方案。</p>

      <div class="tip-box">
        <strong>参考资源</strong>：<br>
        Ollama：<a href="https://github.com/ollama/ollama" target="_blank">github.com/ollama/ollama</a><br>
        LangChain：<a href="https://github.com/langchain-ai/langchain" target="_blank">github.com/langchain-ai/langchain</a><br>
        ChromaDB：<a href="https://github.com/chroma-core/chroma" target="_blank">github.com/chroma-core/chroma</a>
      </div>
