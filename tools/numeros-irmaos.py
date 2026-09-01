#!/usr/bin/env python3
"""Hold this site to the numbers the sibling repositories publish about themselves.

WHY THIS EXISTS.

Each library guards its own figures. `framebudget/tools/tamanho.js` re-measures
the bundle and fails if the README disagrees; `contagem.js` does the same for
the test count. Both run in their own CI on every push.

This page then *quotes* those figures, in the case-study panels, and nothing
was checking that hop. It drifted, exactly as every other unguarded number in
this repository has drifted:

    the site said   framebudget is 10 KB minified   -> it is 11.7 KB
    the site said   all 83 tests were green         -> there are 91

Neither was a lie when it was typed. That is the whole point, and it is the
sixth time it has happened here. A chain of guarded claims is only as good as
its weakest hop, and this was the hop nobody had instrumented.

So: read what the site says, read what the siblings say, and refuse to agree
that they agree when they do not.

    python3 tools/numeros-irmaos.py          check
    python3 tools/numeros-irmaos.py --fix    rewrite the site with the real ones

It reads the siblings' READMEs rather than measuring anything itself. That is
deliberate — those READMEs are already held to the truth by the libraries' own
instruments, so re-measuring here would only add a second opinion that could
disagree with the one CI enforces. This checks that the quote matches the
source, and lets the source be guarded where it lives.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SITE = RAIZ / "site" / "index.html"

# Onde procurar cada irmão. `../nome` na máquina do Rodrigo e em CI (o ci.yml
# clona-os de propósito); `../../nome` se alguém tiver o portefólio uma pasta
# mais fundo.
CANDIDATOS = ("..", "../..")


def irmao(nome: str) -> Path | None:
    for base in CANDIDATOS:
        p = (RAIZ / base / nome).resolve()
        if (p / "README.md").exists():
            return p
    return None


def kb_do_readme(repo: Path) -> str | None:
    """O tamanho minificado que o README da biblioteca declara."""
    m = re.search(r"(\d+\.\d+) KB minified", (repo / "README.md").read_text(encoding="utf-8"))
    return m.group(1) if m else None


# (irmão, padrão no site com um grupo, como obter o valor verdadeiro, descrição)
ALEGACOES = [
    ("framebudget", re.compile(r"\['Size','(\d+(?:\.\d+)?) KB minified'\]"), kb_do_readme,
     "tamanho do framebudget no painel do caso de estudo"),
    ("glaze", re.compile(r"\['Size','(\d+(?:\.\d+)?) KB minified'\]"), kb_do_readme,
     "tamanho do glaze no painel do caso de estudo"),
]


def main() -> int:
    corrigir = "--fix" in sys.argv[1:]
    texto = SITE.read_text(encoding="utf-8")

    faltam = [n for n, *_ in ALEGACOES if irmao(n) is None]
    if faltam:
        # Mesma regra do passo 7 do verificar.sh: em CI os irmãos são clonados
        # de propósito, por isso faltarem lá é falha e não "normal".
        import os
        if os.environ.get("CI"):
            print(f"  !!  irmãos em falta em CI: {', '.join(faltam)}")
            print("      ci.yml clona-os — vê se o path mudou.")
            return 1
        print(f"  --  {', '.join(faltam)} não estão ao lado; nada a comparar (normal no servidor)")
        return 0

    # Os dois padrões são iguais e aparecem por ordem: primeiro o framebudget,
    # depois o glaze. Procura-se cada um a partir do fim do anterior para não
    # trocar as voltas.
    errado = 0
    pos = 0
    for nome, padrao, ler_verdade, descricao in ALEGACOES:
        m = padrao.search(texto, pos)
        if not m:
            print(f"  !!  o site deixou de dizer o {descricao}")
            errado += 1
            continue
        pos = m.end()

        dito = m.group(1)
        verdade = ler_verdade(irmao(nome))
        if verdade is None:
            print(f"  !!  o README do {nome} deixou de declarar o tamanho minificado")
            errado += 1
            continue

        if dito == verdade:
            print(f"  ok  {nome}: {dito} KB, igual ao README do próprio")
            continue

        if corrigir:
            texto = texto[: m.start(1)] + verdade + texto[m.end(1) :]
            print(f"  ..  {nome}: {dito} -> {verdade} KB")
            pos = m.start(1) + len(verdade)
        else:
            print(f"  !!  {descricao}: o site diz {dito} KB, o README diz {verdade} KB")
            errado += 1

    if corrigir:
        SITE.write_text(texto, encoding="utf-8")
        return 0
    if errado:
        print("      Corrige com:  python3 tools/numeros-irmaos.py --fix")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
