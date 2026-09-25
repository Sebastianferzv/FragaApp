export function calcularCosto({ gramos, horas }, settings) {
  const costoFilamento = (gramos / 1000) * settings.precioKiloFilamento;
  const costoLuz = horas * settings.consumoKw * settings.precioKwh;
  const costoDesgaste = horas * settings.desgastePorHora;
  const costoTotal = costoFilamento + costoLuz + costoDesgaste;
  return { costoFilamento, costoLuz, costoDesgaste, costoTotal };
}

export function calcularMargen(precioVenta, costoTotal) {
  const margen = precioVenta - costoTotal;
  const margenPct = precioVenta > 0 ? (margen / precioVenta) * 100 : 0;
  return { margen, margenPct };
}

export function calcularGananciaNetaIva(precioVenta, costoTotal, ivaPct) {
  const precioNeto = precioVenta / (1 + (ivaPct || 0) / 100);
  const gananciaNeta = precioNeto - costoTotal;
  const gananciaNetaPct = precioVenta > 0 ? (gananciaNeta / precioVenta) * 100 : 0;
  return { gananciaNeta, gananciaNetaPct };
}

const CLP_FORMAT = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(value) {
  return CLP_FORMAT.format(Math.round(value || 0));
}

export function formatPct(value) {
  return `${(value || 0).toFixed(1)}%`;
}
