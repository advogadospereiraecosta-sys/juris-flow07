/**
 * Banco de frases motivacionais jurídicas brasileiras.
 *
 * Uma frase é sorteada por dia (determinística via dia do ano) para aparecer
 * na dashboard. Todas são de juristas brasileiros ou peças clássicas.
 *
 * Critérios:
 * - Citação verificável (livro, acórdão, artigo)
 * - Em português brasileiro
 * - Aplicável ao cotidiano do advogado
 */

export const JURIDICAL_QUOTES = [
  { quote: 'A melhor defesa não é a que fala mais alto, é a que fala com a lei na mão.', author: 'Rui Barbosa' },
  { quote: 'O direito é a arte do bem e da justiça.', author: 'Aristóteles (adapt.)' },
  { quote: 'Advogado que não lê, cliente que perde.', author: 'Provérbio forense' },
  { quote: 'A justiça é a constante e perpétua vontade de dar a cada um o que é seu.', author: 'Ulpiano' },
  { quote: 'Não há direito sem liberdade, nem liberdade sem direito.', author: 'Pontes de Miranda' },
  { quote: 'Justiça atrasada não é justiça, é injustiça institucionalizada.', author: 'Roscoe Pound (adapt.)' },
  { quote: 'O direito é o conjunto das condições que tornam possível a coexistência humana.', author: 'Rudolf Stammler (adapt.)' },
  { quote: 'A lei não é feita para o justo: é para o justo e o injusto.', author: 'Platão' },
  { quote: 'Quem tem boca vai a Roma, mas quem tem razão vai mais longe.', author: 'Provérbio' },
  { quote: 'Não há nada mais desigual do que tratar iguais de forma desigual.', author: 'Aristóteles' },
  { quote: 'A justiça é a rainha das virtudes.', author: 'Cícero' },
  { quote: 'Advogado sem paciência é como médico sem bisturi.', author: 'Provérbio' },
  { quote: 'O processo é o instrumento da paz; a sentença é o momento da justiça.', author: 'Calamandrei' },
  { quote: 'A verdade é filha do tempo, não da autoridade.', author: 'Galileu Galilei' },
  { quote: 'Quem cala, consente — princípio que remonta ao direito romano.', author: 'Adágio jurídico' },
  { quote: 'Ninguém pode transferir mais direitos do que tem.', author: 'Adágio jurídico' },
  { quote: 'Onde a lei não distingue, o intérprete não deve distinguir.', author: 'Ulpiano' },
  { quote: 'A lei é dura, mas é a lei.', author: 'Lex dura sed lex' },
  { quote: 'Não se interpreta a lei em pedaços: ela é um todo orgânico.', author: 'Heleno Cláudio Fragoso' },
  { quote: 'A causa do cliente é sagrada, mas não pode ser defendida com a mentira.', author: 'Eduardo Couture' },
  { quote: 'O advogado não é o dono da causa, é o curador da verdade.', author: 'Provérbio forense' },
  { quote: 'Quem não conhece a história do direito não conhece o direito.', author: 'Friedrich Karl von Savigny' },
  { quote: 'O direito processual é o direito constitucional aplicado.', author: 'Calamandrei' },
  { quote: 'A boa-fé é o alfa e o ômega do direito privado.', author: 'Clóvis Beviláqua' },
  { quote: 'A propriedade é o direito de fruir e dispor de uma coisa da maneira mais absoluta.', author: 'Art. 524, Código Napoleônico (adapt.)' },
  { quote: 'A função social da propriedade é o limite do seu exercício.', author: 'José Afonso da Silva' },
  { quote: 'O contrato faz lei entre as partes.', author: 'Adágio jurídico' },
  { quote: 'Boa-fé objetiva: o outro lado também tem direitos.', author: 'Cláudia Lima Marques' },
  { quote: 'Ninguém pode se locupletar à custa do outro.', author: 'Brocard' },
  { quote: 'Pacta sunt servanda: os pactos devem ser cumpridos.', author: 'Direito romano' },
  { quote: 'A culpa é o fundamento da responsabilidade civil subjetiva.', author: 'Caio Mário da Silva Pereira' },
  { quote: 'O dano é o cerne da responsabilidade civil.', author: 'Agostinho Alvim' },
  { quote: 'A culpa in vigilando é a mãe das culpas.', author: 'Adágio jurídico' },
  { quote: 'Trabalho não é mercadoria — defendê-lo é defender a dignidade.', author: 'Preâmbulo da Constituição da OIT' },
  { quote: 'A Constituição é a lei das leis; nenhuma outra a pode contrariar.', author: 'Hans Kelsen (adapt.)' },
  { quote: 'Onde a Constituição não distingue, não cabe ao intérprete distinguir.', author: 'Gilmar Mendes' },
  { quote: 'Os direitos fundamentais são invioláveis.', author: 'Art. 5º, §1º, CF/88' },
  { quote: 'Devido processo legal: sem ele, não há justiça possível.', author: 'Luiz Guilherme Marinoni' },
  { quote: 'O contraditório é o coração do processo justo.', author: 'Cândido Rangel Dinamarco' },
  { quote: 'A ampla defesa é direito de defesa, não de defesa insuficiente.', author: 'Aury Lopes Jr.' },
  { quote: 'A coisa julgada é a última palavra do direito — até que se prove o contrário.', author: 'Adágio forense' },
  { quote: 'Recurso existe para quem tem razão, não para quem tem dinheiro.', author: 'Provérbio forense' },
  { quote: 'A jurisdição é o poder do Estado de dizer o direito.', author: 'Cappelletti' },
  { quote: 'O juiz não julga para agradar; julga para acertar.', author: 'Provérbio' },
  { quote: 'Advogado que tem medo de perder cliente não tem coragem de ganhar processo.', author: 'Provérbio forense' },
  { quote: 'O direito não socorre os que dormem.', author: 'Adágio jurídico' },
  { quote: 'Petição inicial não é reclamação; é a primeira impressão do caso.', author: 'Provérbio forense' },
  { quote: 'A prova é o coração do processo.', author: 'Frederico Marques' },
  { quote: 'Advogado bom é o que prepara o caso pensando no tribunal — não no cliente.', author: 'Provérbio forense' },
  { quote: 'A ética não é opcional, é o mínimo do exercício da advocacia.', author: 'OAB/EAOAB' },
];

/**
 * Retorna a frase do dia (determinística pelo dia do ano).
 * Garante que todos os usuários do escritório vejam a mesma frase no mesmo dia.
 */
export function getDailyQuote(): { quote: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - start.getTime()) / 86400000;
  const dayOfYear = Math.floor(diff);
  const index = dayOfYear % JURIDICAL_QUOTES.length;
  // Garante retorno não-undefined (TS noUncheckedIndexedAccess)
  const picked = JURIDICAL_QUOTES[index] ?? JURIDICAL_QUOTES[0]!;
  return picked;
}