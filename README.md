# PalhagHQ — leitor de quadrinhos

Biblioteca e leitor privado para **CBR, CBZ, ZIP, PDF, JPG, PNG, WEBP e AVIF**. Os arquivos escolhidos são processados no próprio navegador e não são enviados para nenhum servidor.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub.
2. Extraia este pacote e envie **todos os arquivos e pastas** para a raiz do repositório. O `index.html` precisa ficar na raiz.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, a pasta `/ (root)` e clique em **Save**.
6. Aguarde o endereço do site aparecer na mesma tela.

Se estiver substituindo uma versão anterior, envie todos os arquivos novamente. Depois da publicação, feche e abra o site uma vez para o navegador trocar o cache offline antigo pela versão nova.

Não é necessário configurar banco de dados, servidor, chave de API ou variável de ambiente.

## Principais controles

- **Biblioteca local:** ao importar uma HQ, o site identifica o nome, gera a capa e salva ficha, arquivo e progresso no banco local do navegador quando há espaço disponível.
- **Descobrir:** pesquisa edições e sinopses usando Google Books e Open Library. O catálogo serve para informação e organização; a leitura continua exigindo um arquivo do usuário.
- **Quero ler:** salva uma ficha sem o arquivo para lembrar depois.
- **Vinculação direta:** arraste CBR, CBZ ou PDF sobre uma ficha da biblioteca ou do catálogo para associar o arquivo à edição.
- **Zoom Livre:** mantém a página visível e permite arrastar com o mouse ou com o dedo sobre qualquer fala, caixa de texto ou detalhe da arte.
- **Zoom móvel completo:** faça pinça para ampliar e arraste com um dedo para percorrer toda a página sem reduzir a nitidez, inclusive na rolagem vertical.
- **Rolagem no tamanho certo:** o modo vertical abre em ajuste de página, sem ampliar a HQ até ocupar toda a largura do PC.
- **Ajustes reais na rolagem:** Página encaixa a folha inteira, Largura ocupa a área horizontal e Original usa os pixels do arquivo.
- **Zoom visível em todos os modos:** os botões `−`, `100%` e `+` funcionam de 50% a 300% na rolagem e até 500% nos modos paginados.
- **Ampliação móvel do Zoom Livre:** o trecho ampliado pode ser reposicionado por arrasto e ajustado por pinça, sem uma segunda marcação sobre a HQ.
- **Toque rápido:** no celular, também é possível apenas tocar no centro do texto; o leitor cria uma área confortável automaticamente.
- **Ampliação ajustável:** use **−**, **+** ou o indicador central para escolher de 1,5× a 6× e restaurar o padrão de 2,8×.
- **Nova área:** toque no trecho ampliado ou no botão **Nova área** para selecionar outra parte da mesma página.
- **G:** ativa ou encerra o Zoom Livre. O atalho do navegador **Ctrl+F** permanece livre.
- **Setas:** mudam de página conforme a direção escolhida.
- **+ / − / 0:** altera ou restaura o zoom.
- **Página única, dupla e rolagem vertical:** o Zoom Livre funciona sem trocar o modo atual.
- **Mesmos modos no celular:** página única, página dupla e rolagem ficam disponíveis também em telas pequenas.
- **Virada de página:** no modo de duas páginas, avançar ou voltar reproduz uma animação de folha virando; a animação é reduzida quando essa preferência estiver ativa no sistema.
- **Celular:** layout adaptado às áreas seguras da tela, miniaturas isoladas da barra inferior, controles completos de zoom, rotação e tela cheia, além de rolagem contínua sem saltos de página.
- **Brilho, contraste, rotação, largura, página inteira e tela cheia.**
- **Banco local:** guarda fichas, progresso, preferências e, quando o navegador permite, o próprio arquivo da HQ somente neste aparelho.

## Observações

- CBR e CBZ protegidos por senha, divididos em várias partes ou danificados podem não abrir.
- Arquivos muito grandes dependem da memória disponível no aparelho.
- A biblioteca é específica deste navegador e deste aparelho. Limpar os dados do site também remove fichas e arquivos guardados localmente.
- Se o navegador não tiver espaço suficiente para guardar uma HQ grande, ela continuará disponível durante a sessão atual e poderá ser vinculada novamente depois.
- A busca do Google Books funciona melhor com uma chave de API restrita ao domínio do GitHub Pages. Sem chave, o leitor tenta o acesso público disponível e usa a Open Library como alternativa.
- O Zoom Livre funciona com qualquer desenho ou cor, pois a área é escolhida diretamente pelo leitor e não depende de reconhecimento automático.
- Após a primeira visita, o aplicativo pode funcionar offline graças ao cache do navegador.

Use apenas quadrinhos e documentos que você tenha autorização para ler.
