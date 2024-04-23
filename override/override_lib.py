# Regex: ".+?"|'.+?'|(?:\S+)
import re
from enum import Enum
from typing import NamedTuple
from dataclasses import dataclass
import os


class ErrorType(Enum):
    WRONG_TYPE = 1
    NOT_PROVIDED = 2
    NULL = 3


class TokenType(Enum):
    KEYWORD = 1
    STRING = 2
    CODE = 3


class KeyType(Enum):
    WORKSPACE = 1
    ON = 2
    FROM = 3
    TO = 4
    NULL = 5


class Token(NamedTuple):
    text: str
    key: KeyType
    typ: TokenType


class ErrorInfo(NamedTuple):
    typ: ErrorType
    loc: int
    expected: TokenType


@dataclass
class Selector:
    start: int
    end: int


@dataclass
class FileInformation:
    data: str
    abs_location: str


def create_token(text: str) -> Token:
    if not text:
        return Token("", KeyType.NULL, TokenType.KEYWORD)

    if text[0] == '"' and text[-1] == '"':
        return Token(text[1:-1], KeyType.NULL, TokenType.STRING)
    elif text == "workspace":
        return Token("", KeyType.WORKSPACE, TokenType.KEYWORD)
    elif text == "on":
        return Token("", KeyType.ON, TokenType.KEYWORD)
    elif text == "from":
        return Token("", KeyType.FROM, TokenType.KEYWORD)
    elif text == "to":
        return Token("", KeyType.TO, TokenType.KEYWORD)

    return Token(text, KeyType.NULL, TokenType.STRING)


def key_type_to_human(token: KeyType) -> str:
    if token == KeyType.WORKSPACE:
        return "workspace"
    elif token == KeyType.ON:
        return "on"
    elif token == KeyType.FROM:
        return "from"
    elif token == KeyType.TO:
        return "to"
    elif token == KeyType.NULL:
        return "null"


def token_type_to_human(token: TokenType, possible_keyword: KeyType) -> str:
    if token == TokenType.CODE:
        return "code"
    elif token == TokenType.KEYWORD:
        if possible_keyword is None:
            return "keyword"
        return key_type_to_human(possible_keyword)
    elif token == TokenType.STRING:
        return "string"


def handle_error_or_skip(seq: list[Token], out: ErrorInfo):
    if out.typ == ErrorType.WRONG_TYPE:
        raise TypeError(
            f"Expected type {token_type_to_human(out.expected)} but found {token_type_to_human(seq[out.index])}"
        )
    elif out.typ == ErrorType.NOT_PROVIDED:
        raise IndexError(
            f"A token of type {token_type_to_human(out.expected)} was not provided"
        )


def check_next_tokenType(iterable: list[Token], typ: TokenType, idx: int) -> ErrorInfo:
    if idx + 1 >= len(iterable):
        return ErrorInfo(ErrorType.NOT_PROVIDED, idx + 1, typ)
    elif iterable[idx + 1].typ == typ:
        return ErrorInfo(ErrorType.NULL, idx + 1, typ)
    else:
        return ErrorInfo(ErrorType.WRONG_TYPE, idx + 1, typ)


def read_file(filename: str) -> str:
    t = ""
    with open(filename, "r", encoding="utf-8") as file:
        t = file.read()
    return t


def close_file_and_save(file: FileInformation):
    with open(file.abs_location, "w", encoding="utf-8") as f:
        f.write(file.data)


def replace_in_range(text: str, start: int, end: int, target: str) -> str:
    return text[:start] + target + text[end:]


def parse_tokens(text: str) -> list[Token]:
    tokens: list[Token] = []

    for match in re.finditer(r"\".+?\"|'.+?'|(?:\S+)", text):
        tokens.append(create_token(match.group(0)))

    return tokens


def interpret_text(inp: str):

    tokens: list[Token] = parse_tokens(inp)

    selected_file: FileInformation = FileInformation("", "")
    selector: Selector = Selector(0, 0)

    i = 0
    while i < len(tokens):
        if tokens[i].typ == TokenType.KEYWORD:
            if tokens[i].key == KeyType.NULL:
                i += 1
                continue
            elif tokens[i].key == KeyType.WORKSPACE:
                handle_error_or_skip(
                    tokens, check_next_tokenType(tokens, TokenType.STRING, i)
                )
                os.chdir(tokens[i + 1].text)
                i += 2
                continue
            elif tokens[i].key == KeyType.ON:
                handle_error_or_skip(
                    tokens, check_next_tokenType(tokens, TokenType.STRING, i)
                )
                if selected_file.abs_location:
                    close_file_and_save(selected_file)
                abs_path = os.path.abspath(tokens[i + 1].text)
                selected_file.abs_location = abs_path
                selected_file.data = read_file(abs_path)
                i += 2
                continue
            elif tokens[i].key == KeyType.FROM:
                handle_error_or_skip(
                    tokens, check_next_tokenType(tokens, TokenType.STRING, i)
                )
                pos = selected_file.data.find(tokens[i + 1].text)
                if pos == -1:
                    print(f"WARNING: Couldn't find '{tokens[i + 1].text}'!")
                    selector = Selector(0, 0)
                    i += 2
                    continue
                selector.start = pos
                selector.end = selector.start + len(tokens[i + 1].text)
                i += 2
                continue
            elif tokens[i].key == KeyType.TO:
                handle_error_or_skip(
                    tokens, check_next_tokenType(tokens, TokenType.STRING, i)
                )
                if selector.start == 0 and selector.end == 0:
                    print(
                        f"WARNING: Just tried to replace a non valid selection by '{tokens[i + 1].text}'!"
                    )
                    i += 2
                    continue
                selected_file.data = replace_in_range(
                    selected_file.data, selector.start, selector.end, tokens[i + 1].text
                )
                selector.end = selector.start + len(tokens[i + 1].text)
                i += 2
                continue
        i += 1

    if selected_file.abs_location:
        close_file_and_save(selected_file)
