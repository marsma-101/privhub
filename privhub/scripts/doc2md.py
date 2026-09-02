#!/usr/bin/env python3
"""
doc2md.py — 旧版 Word .doc → Markdown 转换（PrivHub 兜底方案）

很多「.doc」文件实际是三种格式之一：
  1. OLE2 复合文档（真 .doc）→ olefile 解析 WordDocument 流提取文本
  2. RTF 伪装（{\\rtf...}）→ 剥 RTF 控制字
  3. HTML 伪装（<html...>）→ 剥标签
纯 Python 实现，零外部依赖（仅 olefile）。

用法：
  python doc2md.py <input.doc> [output.md]
  （不传 output 时打印到 stdout；失败退出码非 0，错误信息到 stderr）
"""

import sys
import re
import struct


def detect_format(data: bytes) -> str:
    """按魔数判断真实格式。"""
    if data[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        return "ole2"
    if data.startswith(b"{\\rtf"):
        return "rtf"
    head = data[:512].lower()
    if b"<html" in head or b"<!doctype html" in head:
        return "html"
    return "ole2"  # 默认按 OLE2 尝试


def decode_word_text(word_doc: bytes) -> str:
    """
    从 OLE2 WordDocument 流提取文本（FIB 解析）。
    Word 二进制格式：
      - WordDocument 流前 32 字节是 FIB base
      - offset 0x000A: flags（bit 9 = fWhichTblStm；Unicode 判断在 fExtChar）
      - 文本区通常从 0x400 (1024) 开始（fcMin 默认）
      - 若 FIB 指示 Unicode（fExtChar/文本用 UTF-16LE），按 UTF-16LE 解码；
        否则按 CP1252（ANSI）。
    """
    if len(word_doc) < 0x400:
        return ""
    # FIB flags: offset 0x000A 两字节（wIdent 之后）
    flags = struct.unpack_from("<H", word_doc, 0x0A)[0] if len(word_doc) >= 0x0C else 0
    text = word_doc[0x400:]
    # 尝试 UTF-16LE（多数 .doc 用；无效字节会被替换）
    try:
        decoded = text.decode("utf-16-le", errors="ignore")
        # 过滤控制字符，保留可读文本
        clean = "".join(ch for ch in decoded if ch == "\n" or ch == "\t" or ch.isprintable() or ch in "\r")
        if sum(1 for ch in clean if ch.isalpha()) > 0:
            return clean
    except Exception:
        pass
    # 回退 ANSI (CP1252)
    decoded = text.decode("cp1252", errors="ignore")
    return "".join(ch for ch in decoded if ch == "\n" or ch == "\t" or ch.isprintable() or ch in "\r")


def parse_rtf(data: bytes) -> str:
    """剥 RTF 控制字，提取纯文本（含中文）。"""
    try:
        text = data.decode("cp1252", errors="ignore")
    except Exception:
        text = data.decode("latin-1", errors="ignore")
    # 中文 RTF 用 \uN? 表示 Unicode 字符
    def unicode_escape(m):
        try:
            return chr(int(m.group(1)))
        except Exception:
            return ""
    text = re.sub(r"\\u(-?\d+)\??", unicode_escape, text)
    # 剥控制字 \word 和 \'hh 十六进制
    text = re.sub(r"\\'[0-9a-fA-F]{2}", "", text)
    text = re.sub(r"\\[a-zA-Z]+-?\d* ?", "", text)
    # 剥花括号与分隔符
    text = text.replace("{", "").replace("}", "")
    # 十六进制文本组（\bin 二进制跳过，这里简单处理）
    lines = [ln.strip() for ln in text.split("\n")]
    return "\n".join(ln for ln in lines if ln)


def parse_html(data: bytes) -> str:
    """剥 HTML 标签，保留文本。"""
    text = data.decode("utf-8", errors="ignore")
    text = re.sub(r"<script[\s\S]*?</script>", "", text, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    import html as html_mod
    text = html_mod.unescape(text)
    lines = [ln.strip() for ln in text.split("\n")]
    return "\n".join(ln for ln in lines if ln)


def doc_to_markdown(data: bytes) -> str:
    """入口：检测格式并转换为 Markdown 文本。"""
    fmt = detect_format(data)
    if fmt == "rtf":
        text = parse_rtf(data)
        if text.strip():
            return text
    if fmt == "html":
        text = parse_html(data)
        if text.strip():
            return text
    # OLE2（或默认）：olefile 解析 WordDocument 流
    try:
        import olefile
        import io
        ole = olefile.OleFileIO(io.BytesIO(data))
        try:
            if ole.exists("WordDocument"):
                word_doc = ole.openstream("WordDocument").read()
                text = decode_word_text(word_doc)
                if text.strip():
                    return text
            # 备用：0Table/1Table 里的文本流（复杂），此处省略
        finally:
            ole.close()
    except Exception:
        pass
    raise ValueError("无法解析该 .doc 文件（不是标准 OLE2 Word / RTF / HTML）")


def main():
    if len(sys.argv) < 2:
        print("用法: python doc2md.py <input.doc> [output.md]", file=sys.stderr)
        sys.exit(2)
    in_path = sys.argv[1]
    with open(in_path, "rb") as f:
        data = f.read()
    md = doc_to_markdown(data)
    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(md)
        print(f"已转换: {in_path} → {sys.argv[2]}（{len(md)} 字符）", file=sys.stderr)
    else:
        sys.stdout.write(md)


if __name__ == "__main__":
    main()
