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
