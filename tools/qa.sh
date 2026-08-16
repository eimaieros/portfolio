#!/bin/bash
# site/_qa.html: cópia do index para inspecção automatizada.
#
# O ambiente de captura (CDP sem janela em primeiro plano) reporta sempre
# document.hidden = true. O site usa isso — correctamente — para não gastar GPU
# em separadores escondidos, com o resultado de que NADA se desenha e eu
# concluía que estava partido quando não estava. Aqui mente-se ao site: hidden
# passa a false, sem tocar numa única linha do código publicado.
#
# Também se estica o fecho automático da porta, para dar tempo de a examinar
# entre chamadas de ferramenta.
#
# Nunca é o ficheiro publicado. Apagar com: rm site/_qa.html
set -e
cd "$(dirname "$0")/.."

python3 - << 'PY'
src = open('site/index.html', encoding='utf-8').read()

shim = """<script>
/* QA — não faz parte do site. Ver tools/qa.sh */
Object.defineProperty(Document.prototype,'hidden',{get(){return false},configurable:true});
Object.defineProperty(Document.prototype,'visibilityState',{get(){return 'visible'},configurable:true});
</script>
"""
i = src.index('</head>')
out = src[:i] + shim + src[i:]
out = out.replace('closeGate, 4200', 'closeGate, 120000')



open('site/_qa.html', 'w', encoding='utf-8').write(out)
print('site/_qa.html pronto — document.hidden forçado a false')
PY
