"""Backward-compatible entry point: writes the claude.ai artifact bundle to out/.
For the GitHub Pages site use: python scripts/build_site.py"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_site  # noqa: E402

build_site.build_artifact()
