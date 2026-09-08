const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const formatMxn = (minorUnits: number) => mxn.format(minorUnits / 100);
