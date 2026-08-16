#!/usr/bin/env python3
"""
Procura o erro que já me mordeu três vezes: usar uma const/let de topo antes da
linha onde está declarada. O JavaScript não avisa em análise estática — só
rebenta em execução, e só quando aquele caminho é percorrido.

Não é um parser: é uma heurística textual sobre declarações de topo. Falsos
positivos são possíveis (nomes curtos, usos dentro de funções que só correm
mais tarde). Falsos negativos também. Serve para levantar suspeitas.
"""
import re, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'site/index.html'
src = open(path, encoding='utf-8').read()
i = src.index('<script>', src.index('</style>'))
body = src[i:]

# limpar strings e comentários para contar chavetas e procurar usos
# apagar o conteúdo mantendo as mudanças de linha: sem isto os números de
# linha deslizam e o relatório aponta para o sítio errado (aconteceu-me)
def blank(m):
    t = m.group(0)
    return ''.join(c if c == '\n' else ' ' for c in t)

clean = re.sub(r'`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'|//[^\n]*|/\*.*?\*/',
               blank, body, flags=re.S)

lines = clean.split('\n')
depth, decls = 0, {}
for n, line in enumerate(lines, 1):
    m = re.match(r'\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=', line)
    if m and depth <= 1:
        decls.setdefault(m.group(1), n)
    depth += line.count('{') - line.count('}')

# profundidade linha a linha: um uso dentro de uma função (profundidade > 1)
# só corre quando a função é chamada, e nessa altura a declaração já existe.
# Só interessam usos ao nível de topo, que correm durante a avaliação do módulo.
line_depth, d = [], 0
for line in lines:
    line_depth.append(d)
    d += line.count('{') - line.count('}')

# Falsos positivos confirmados à mão. Um alarme que toca sempre deixa de ser
# alarme — se se acrescentar aqui um nome, tem de se dizer porquê.
CONHECIDOS = {
    # `menu` é usado dentro do handler de keydown, que só corre quando alguém
    # carrega numa tecla — muito depois da avaliação do módulo.
    'menu',
}

bad = []
for name, decl_line in decls.items():
    if len(name) < 3 or name in CONHECIDOS:
        continue
    pat = re.compile(r'(?<![\w$.])' + re.escape(name) + r'(?![\w$])')
    for n, line in enumerate(lines[:decl_line - 1], 1):
        if line_depth[n - 1] > 1:
            continue
        if re.match(r'\s*(?:const|let|var|function)\s', line):
            continue            # redeclaração/sombra, não é uso
        if pat.search(line):
            bad.append((name, n, decl_line, body.split('\n')[n - 1].strip()[:88]))
            break

if bad:
    print(f'{len(bad)} suspeita(s) — confirmar à mão se o uso corre mesmo na avaliação\n    do módulo ou só dentro de uma função chamada mais tarde:\n')
    for name, use, decl, txt in sorted(bad, key=lambda b: b[1]):
        print(f'  {name}: usado na linha ~{use} do script, declarado na ~{decl}')
        print(f'      {txt}')
    sys.exit(1)
print("sem usos antes da declaração ao nível de topo")
