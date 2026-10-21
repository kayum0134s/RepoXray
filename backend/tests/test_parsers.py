import pytest
from app.parsers.python_parser import PythonParser
from app.parsers.javascript_parser import JavaScriptParser
from app.parsers.typescript_parser import TypeScriptParser
from app.services.parser_service import ParserService

def test_python_parser_valid():
    """Test PythonParser against valid Python source code."""
    parser = PythonParser()
    code = """import os
from datetime import datetime as dt

class User:
    def __init__(self, name: str):
        self.name = name

def calculate_total(items):
    return sum(items)

async def fetch_data():
    pass

MAX_RETRIES = 5
"""
    result = parser.parse_source(code, "test.py")
    assert result["parsed_successfully"] is True

    symbols = {s["name"]: s for s in result["symbols"]}
    assert "User" in symbols
    assert symbols["User"]["type"] == "class"

    assert "calculate_total" in symbols
    assert symbols["calculate_total"]["type"] == "function"

    assert "fetch_data" in symbols
    assert symbols["fetch_data"]["type"] == "function"

    assert "MAX_RETRIES" in symbols
    assert symbols["MAX_RETRIES"]["type"] == "variable"

    imports = result["imports"]
    module_names = [i["module"] for i in imports]
    assert "os" in module_names
    assert "datetime" in module_names

def test_python_parser_invalid_syntax():
    """Test PythonParser graceful error handling on malformed code."""
    parser = PythonParser()
    code = "def broken_func(:\n    class {{ invalid python"
    result = parser.parse_source(code, "invalid.py")
    assert result["parsed_successfully"] is False
    assert "Syntax/AST error" in result["error"]

def test_javascript_parser_valid():
    """Test JavaScriptParser for ESM/CommonJS imports, exports, functions, classes, and components."""
    parser = JavaScriptParser()
    code = """import React from 'react';
import { useState, useEffect } from 'react';
const fs = require('fs');

export class HeaderComponent {
    render() {}
}

export function calculateScore(a, b) {
    return a + b;
}

const UserCard = () => {
    return <div>User</div>;
};

const API_KEY = "12345";
"""
    result = parser.parse_source(code, "component.jsx")
    assert result["parsed_successfully"] is True

    symbols = {s["name"]: s for s in result["symbols"]}
    assert "HeaderComponent" in symbols
    assert symbols["HeaderComponent"]["type"] == "class"

    assert "calculateScore" in symbols
    assert symbols["calculateScore"]["type"] == "function"

    assert "UserCard" in symbols
    assert symbols["UserCard"]["type"] == "component"

    assert "API_KEY" in symbols

    imports = result["imports"]
    modules = [i["module"] for i in imports]
    assert "react" in modules
    assert "fs" in modules

def test_javascript_parser_invalid_syntax():
    """Test JavaScriptParser handling malformed JavaScript code without crashing."""
    parser = JavaScriptParser()
    code = "function ( { {{ const = ;"
    result = parser.parse_source(code, "invalid.js")
    # Tree-sitter handles error nodes smoothly without throwing exceptions
    assert "symbols" in result
    assert "imports" in result

def test_typescript_parser_valid():
    """Test TypeScriptParser for interfaces, type aliases, enums, and TSX components."""
    parser = TypeScriptParser(is_tsx=True)
    code = """import React from 'react';

export interface UserProfile {
    id: string;
    username: string;
}

export type Status = 'active' | 'inactive';

export enum Role {
    Admin = 'ADMIN',
    User = 'USER'
}

export const Dashboard: React.FC = () => {
    return <div>Dashboard</div>;
};
"""
    result = parser.parse_source(code, "Dashboard.tsx")
    assert result["parsed_successfully"] is True

    symbols = {s["name"]: s for s in result["symbols"]}
    assert "UserProfile" in symbols
    assert symbols["UserProfile"]["type"] == "interface"

    assert "Status" in symbols
    assert symbols["Status"]["type"] == "type"

    assert "Role" in symbols
    assert symbols["Role"]["type"] == "enum"

    assert "Dashboard" in symbols
    assert symbols["Dashboard"]["type"] == "component"

def test_typescript_parser_invalid_syntax():
    """Test TypeScriptParser on malformed TS code."""
    parser = TypeScriptParser(is_tsx=True)
    code = "interface UserProfile {{ type status = ;;"
    result = parser.parse_source(code, "invalid.tsx")
    assert "symbols" in result
    assert "imports" in result

def test_parser_service_dispatcher():
    """Test ParserService file routing and parsing."""
    service = ParserService()

    py_res = service.parse_file("def foo(): pass", "main.py")
    assert py_res["parsed_successfully"] is True
    assert any(s["name"] == "foo" for s in py_res["symbols"])

    ts_res = service.parse_file("interface Config { key: string; }", "config.ts")
    assert ts_res["parsed_successfully"] is True
    assert any(s["name"] == "Config" for s in ts_res["symbols"])

    txt_res = service.parse_file("plain text", "notes.txt")
    assert txt_res["symbols"] == []
