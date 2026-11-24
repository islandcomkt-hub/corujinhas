/* Abertura com a logo: uma vez por sessão, nunca ao voltar pelo histórico, nunca com movimento reduzido no sistema.
   A camada não recebe cliques e some sozinha. */
(function () {
  var r = document.documentElement; r.classList.add("js");
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var voltou = nav && nav.type === "back_forward";
    var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduzido && !voltou && !sessionStorage.getItem("corujinhas-abertura")) {
      r.classList.add("com-abertura");
      sessionStorage.setItem("corujinhas-abertura", "1");
    }
  } catch (e) {}
})();
