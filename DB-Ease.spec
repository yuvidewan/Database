# -*- mode: python ; coding: utf-8 -*-
import os

a = Analysis(
    ['run.py'],
    pathex=[os.path.abspath('.'), os.path.abspath('./backend')],
    binaries=[],
    datas=[('frontend', 'frontend')], # Only need to add the frontend folder
    hiddenimports=[
        "fastapi",
        "fastapi.staticfiles", # FIX: Added the missing module
        "fastapi.middleware",
        "fastapi.middleware.cors",
        "starlette.middleware",
        "starlette.middleware.cors",
        "starlette.routing",
        "starlette.types",
        "starlette.responses",
        "starlette.requests",
        "starlette.datastructures",
        "starlette.background",
        "pydantic",
        "anyio",
        "uvicorn",
        "uvicorn.config",
        "uvicorn.lifespan",
        "uvicorn.loops",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='DB-Ease',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
