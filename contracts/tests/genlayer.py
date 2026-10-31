"""Minimal genlayer SDK stub — lets us unit-test pure helpers offline."""
import dataclasses as _dc


class _Map(dict):
    def get(self, k, default=None):
        return dict.get(self, k, default)


class TreeMap(_Map):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)


class DynArray(list):
    pass


Address = str


def u256(x=0):
    return int(x)


def u8(x=0):
    return int(x)


def allow_storage(cls):
    return cls


# re-export dataclass so `@dataclass` in contract resolves
dataclass = _dc.dataclass


class _Decorators:
    @staticmethod
    def write(fn):
        fn._gl_public = "write"
        return fn

    @staticmethod
    def view(fn):
        fn._gl_public = "view"
        return fn


class _NondetWeb:
    @staticmethod
    def get(url):
        raise RuntimeError("network disabled in tests")


class _NondetPrompt:
    @staticmethod
    def exec_prompt(prompt, response_format=None):
        raise RuntimeError("llm disabled in tests")


class _NondetEth:
    @staticmethod
    def get_block_by_number(_):
        return {"timestamp": 0}


class _Nondet:
    web = _NondetWeb
    exec_prompt = _NondetPrompt.exec_prompt
    eth = _NondetEth


class _Vm:
    @staticmethod
    def run_nondet_unsafe(leader, validator, *args):
        r = leader(*args)
        assert validator(r, *args), "validator rejected leader"
        return r


class _Message:
    sender_address = "0x0000000000000000000000000000000000000001"


class _Storage:
    @staticmethod
    def copy_to_memory(m):
        return m


class _Eq:
    @staticmethod
    def strict_eq(fn):
        return fn


class Contract:
    pass


class gl:
    Contract = Contract
    public = _Decorators
    nondet = _Nondet
    vm = _Vm
    message = _Message
    storage = _Storage
    eq_principle = _Eq
