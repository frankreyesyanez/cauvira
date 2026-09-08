import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

function StateIcon({ symbol }: { symbol: string }) {
  return (
    <span aria-hidden="true" className="ui-icon">
      {symbol}
    </span>
  );
}

export default function BackofficeUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="ui-gallery">
      <header className="ui-gallery__header">
        <div>
          <p className="ui-eyebrow">Cauvira / sistema 01</p>
          <h1>Instrumentos para operar.</h1>
        </div>
        <p className="ui-gallery__intro">
          Base visual del comercio industrial: directa, cálida y precisa.
          Cada estado combina lenguaje, forma y color.
        </p>
      </header>

      <section className="ui-section" aria-labelledby="buttons-title">
        <div className="ui-section__heading">
          <span>01</span>
          <div>
            <h2 id="buttons-title">Acciones</h2>
            <p>Jerarquía comercial y operativa.</p>
          </div>
        </div>
        <div className="ui-cluster">
          <Button>Agregar al pedido</Button>
          <Button variant="secondary">Solicitar cotización</Button>
          <Button variant="danger">Cancelar pedido</Button>
          <Button variant="ghost">Ver detalles</Button>
          <Button loading>Guardar producto</Button>
          <Button disabled>Acción no disponible</Button>
        </div>
      </section>

      <section className="ui-section" aria-labelledby="fields-title">
        <div className="ui-section__heading">
          <span>02</span>
          <div>
            <h2 id="fields-title">Campos</h2>
            <p>Ayuda y errores siempre enlazados al control.</p>
          </div>
        </div>
        <div className="ui-field-grid">
          <Field
            description="Nombre público visible en el catálogo."
            label="Nombre del producto"
            placeholder="Ej. Montacargas eléctrico 2.5 t"
          />
          <Field
            defaultValue="0"
            description="Precio antes de impuestos, expresado en MXN."
            error="Ingresa un precio mayor a cero."
            label="Precio de venta"
            inputMode="decimal"
          />
          <Field
            description="Este valor se sincroniza desde el proveedor."
            disabled
            label="Existencia disponible"
            value="Sincronización pendiente"
            readOnly
          />
        </div>
      </section>

      <section className="ui-section" aria-labelledby="feedback-title">
        <div className="ui-section__heading">
          <span>03</span>
          <div>
            <h2 id="feedback-title">Avisos y estados</h2>
            <p>La forma y el texto sostienen el significado.</p>
          </div>
        </div>
        <div className="ui-feedback-grid">
          <div className="ui-alert ui-alert--opportunity" role="status">
            <StateIcon symbol="↗" />
            <div>
              <strong>Oportunidad lista</strong>
              <p>La cotización puede enviarse al cliente.</p>
            </div>
          </div>
          <div className="ui-alert ui-alert--urgent" role="alert">
            <StateIcon symbol="!" />
            <div>
              <strong>Requiere atención</strong>
              <p>Falta confirmar el costo de proveedor.</p>
            </div>
          </div>
        </div>
        <div className="ui-status-row" aria-label="Estados de operación">
          <span className="ui-status ui-status--active">
            <StateIcon symbol="✓" /> Publicado
          </span>
          <span className="ui-status">
            <StateIcon symbol="○" /> En borrador
          </span>
          <span className="ui-status ui-status--urgent">
            <StateIcon symbol="!" /> Pago pendiente
          </span>
        </div>
      </section>

      <section className="ui-section" aria-labelledby="empty-title">
        <div className="ui-section__heading">
          <span>04</span>
          <div>
            <h2 id="empty-title">Estado vacío</h2>
            <p>Una salida clara, sin ilustración decorativa.</p>
          </div>
        </div>
        <div className="ui-empty">
          <span aria-hidden="true" className="ui-empty__mark">
            +
          </span>
          <div>
            <h3>Aún no hay productos destacados</h3>
            <p>Selecciona productos publicados para mostrarlos en portada.</p>
          </div>
          <Button>Elegir productos</Button>
        </div>
      </section>

      <section className="ui-section" aria-labelledby="products-title">
        <div className="ui-section__heading">
          <span>05</span>
          <div>
            <h2 id="products-title">Producto</h2>
            <p>Compra, cotización y falta de existencia.</p>
          </div>
        </div>
        <div className="ui-product-grid">
          <article className="ui-product">
            <div className="ui-product__media" aria-hidden="true">
              <span>CAFÉ / 01</span>
            </div>
            <div className="ui-product__body">
              <p className="ui-product__category">Café y vending</p>
              <h3>Máquina espresso industrial</h3>
              <p className="ui-product__price">$84,900 MXN</p>
              <p className="ui-product__state">
                <StateIcon symbol="✓" /> Disponible para compra
              </p>
              <Button>Agregar al pedido</Button>
            </div>
          </article>

          <article className="ui-product">
            <div className="ui-product__media ui-product__media--vermilion" aria-hidden="true">
              <span>PROYECTO / 08</span>
            </div>
            <div className="ui-product__body">
              <p className="ui-product__category">Infraestructura deportiva</p>
              <h3>Cancha de pádel panorámica</h3>
              <p className="ui-product__price">Desde $685,000 MXN</p>
              <p className="ui-product__state">
                <StateIcon symbol="→" /> Requiere cotización
              </p>
              <Button variant="secondary">Solicitar cotización</Button>
            </div>
          </article>

          <article className="ui-product">
            <div className="ui-product__media ui-product__media--muted" aria-hidden="true">
              <span>LOGÍSTICA / 12</span>
            </div>
            <div className="ui-product__body">
              <p className="ui-product__category">Manejo de materiales</p>
              <h3>Montacargas eléctrico 2.5 t</h3>
              <p className="ui-product__price">$499,000 MXN</p>
              <p className="ui-product__state">
                <StateIcon symbol="×" /> Temporalmente sin existencia
              </p>
              <Button disabled>Compra no disponible</Button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
