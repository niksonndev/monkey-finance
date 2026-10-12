import { useEffect } from 'react';

/**
 * Trava a rolagem do documento enquanto uma superfície está aberta (modal,
 * folha, gaveta). Sem isso, o gesto de arrastar por dentro da folha empurra a
 * página de trás, que se move por baixo do véu desfocado e redesenha a cada
 * quadro no celular; ao fechar, a pessoa cai em outro ponto da página (o
 * "glitch" que o modal de lançamento já corrigia sozinho).
 *
 * `position: fixed` com o deslocamento atual é o que funciona também no Safari
 * do iPhone.
 *
 * A trava é reentrante (contador no módulo): quando uma superfície abre sobre
 * outra (um diálogo sobre o modal), só a primeira prende o documento e só a
 * última devolve — senão a de baixo restauraria a posição com a rolagem já
 * zerada, e a tela pularia para o topo ao fechar.
 */
let travas = 0;
let deslocamentoOriginal = 0;
let estilosOriginais = null;

export function useBodyScrollLock(ativo) {
  useEffect(() => {
    if (!ativo) return undefined;

    if (travas === 0) {
      const { body } = document;
      deslocamentoOriginal = window.scrollY;
      estilosOriginais = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
      };

      body.style.position = 'fixed';
      body.style.top = `-${deslocamentoOriginal}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }

    travas += 1;

    return () => {
      travas -= 1;
      if (travas === 0 && estilosOriginais) {
        Object.assign(document.body.style, estilosOriginais);
        window.scrollTo(0, deslocamentoOriginal);
        estilosOriginais = null;
      }
    };
  }, [ativo]);
}
