// Documento @react-pdf/renderer para la "Orden de Servicio" (formato GS-FIN-FT).
// Consumido por app/api/ordenes/[id]/pdf/route.tsx, que arma OrdenServicioData
// a partir de Supabase y llama a renderToBuffer(<OrdenServicioDocument data={...} />).
//
// El formato (tabla, colores, banda de encabezado, textos institucionales fijos)
// replica la plantilla oficial en uso por el área administrativa. Los textos
// institucionales fijos (saludo, plazo de entrega de soportes, correo de
// radicación, lista de documentos para factura, datos de quien firma) no
// existen en ninguna tabla de la base de datos — son constantes de este
// archivo (ver GERENTE / NOTA_SOPORTES / NOTA_FECHA_PAGO / DOCUMENTOS_FACTURA
// más abajo). Reemplazarlas si cambian los datos reales de la empresa.

import type { ReactNode } from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { HEADER_BANNER_JPG, LOGO_GS_GROUP_JPG } from "./assets";

export interface OrdenServicioData {
  encabezadoFecha: string;
  encabezadoCodigo: string;
  encabezadoVersion: string;
  fechaEmision: string;
  profesionalNombre: string;
  profesionalCedula: string;
  ciudad: string;
  numeroOrden: string;
  nombreEmpresaCliente: string;
  nombreActividad: string;
  descripcionActividad: string;
  numeroHoras: number;
  fechaEjecucionInicio: string;
  fechaFinalizacionEjecucion: string;
  direccionEmpresaAVisitar: string;
  horaInicioActividad: string;
  finalizacionActividad: string;
  personaContacto: string;
  entregableEstandar: string;
  entregablesEspecificos: string;
  fechaCierreOrden: string;
  profesionalVoBo: string;
  costoHora: string;
  costoTotal: string;
}

const MORADO = "#9E1B7D";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 40,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  banner: {
    width: "100%",
    height: 38,
    marginBottom: 2,
  },
  logo: {
    position: "absolute",
    top: 8,
    right: 40,
    width: 70,
  },
  encabezadoTablaWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  encabezadoTabla: {
    borderWidth: 1,
    borderColor: "#999",
  },
  encabezadoFila: {
    flexDirection: "row",
  },
  encabezadoCeldaLabel: {
    width: 60,
    padding: 3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#999",
    fontWeight: 700,
    backgroundColor: "#f2f2f2",
  },
  encabezadoCeldaValue: {
    width: 60,
    padding: 3,
    borderBottomWidth: 1,
    borderColor: "#999",
  },
  titulo: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  encabezadoFila2: {
    flexDirection: "row",
    marginBottom: 2,
  },
  encabezadoLabel: {
    fontWeight: 700,
  },
  encabezadoValue: {
    marginLeft: 3,
  },
  saludo: {
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 1.3,
  },
  tabla: {
    borderWidth: 1,
    borderColor: "#999",
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#999",
  },
  filaSinBorde: {
    flexDirection: "row",
  },
  celdaLabel: {
    width: "42%",
    padding: 3,
    fontWeight: 700,
    color: MORADO,
    borderRightWidth: 1,
    borderColor: "#999",
  },
  celdaValue: {
    width: "58%",
    padding: 3,
  },
  celdaNota: {
    width: "58%",
    padding: 3,
    fontWeight: 700,
    color: MORADO,
  },
  parrafo: {
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 1.3,
  },
  cordialmente: {
    marginBottom: 14,
  },
  firmaFila: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firmaBloque: {
    width: "45%",
    alignItems: "center",
  },
  firmaLinea: {
    marginBottom: 2,
    textAlign: "center",
  },
  firmaCajaWrapper: {
    width: "45%",
  },
  firmaCaja: {
    borderWidth: 1,
    borderColor: "#999",
    backgroundColor: "#f7f7f7",
    height: 70,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  firmaCajaTexto: {
    textAlign: "center",
    color: "#666",
  },
});

// Datos de quien firma la orden como gerente general — no existe tabla para
// esto en Supabase todavía, es información fija de la empresa.
const GERENTE = {
  nombre: "Bibiana Andrea Sarmiento Ariza",
  cedula: "1019032814",
  cargo: "Gerente general",
};

const NOTA_SOPORTES =
  "Los soportes de las actividades ejecutadas durante la visita deben ser remitidos el mismo día o, a más tardar, al siguiente día calendario al correo: soportesgs25@gmail.com.";

const NOTA_FECHA_PAGO =
  "45 días calendario a partir de la radicación de la cuenta de cobro. La cuenta de cobro debe ser radicada en el correo finanzas@gsgroupsas.com";

const NOTA_CIERRE_ORDEN =
  "La fecha de cierre de la orden de servicio corresponde al plazo máximo para la entrega de todos los documentos que sustenten la gestión de la presente orden.";

const DOCUMENTOS_FACTURA = [
  "Recibido a satisfacción del servicio.",
  "La presente orden de servicio firmada y en formato PDF.",
  "Cuenta de cobro en formato PDF y firmada.",
];

function FilaTabla({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.fila}>
      <Text style={styles.celdaLabel}>{label}</Text>
      <Text style={styles.celdaValue}>{value}</Text>
    </View>
  );
}

export function OrdenServicioDocument({ data }: { data: OrdenServicioData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, no alt prop */}
        <Image src={HEADER_BANNER_JPG} style={styles.banner} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, no alt prop */}
        <Image src={LOGO_GS_GROUP_JPG} style={styles.logo} />

        <View>
          <View style={styles.encabezadoTablaWrapper}>
            <View style={styles.encabezadoTabla}>
              <View style={styles.encabezadoFila}>
                <Text style={styles.encabezadoCeldaLabel}>FECHA</Text>
                <Text style={styles.encabezadoCeldaLabel}>CÓDIGO</Text>
                <Text
                  style={[styles.encabezadoCeldaLabel, { borderRightWidth: 0 }]}
                >
                  VERSIÓN
                </Text>
              </View>
              <View style={styles.encabezadoFila}>
                <Text style={styles.encabezadoCeldaValue}>
                  {data.encabezadoFecha}
                </Text>
                <Text style={styles.encabezadoCeldaValue}>
                  {data.encabezadoCodigo}
                </Text>
                <Text
                  style={[styles.encabezadoCeldaValue, { borderRightWidth: 0 }]}
                >
                  {data.encabezadoVersion}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.titulo}>Orden de servicio</Text>

          <View style={styles.encabezadoFila2}>
            <Text style={styles.encabezadoLabel}>Fecha de emisión:</Text>
            <Text style={styles.encabezadoValue}>{data.fechaEmision}</Text>
          </View>
          <View style={styles.encabezadoFila2}>
            <Text style={styles.encabezadoLabel}>Apreciado profesional:</Text>
            <Text style={styles.encabezadoValue}>{data.profesionalNombre}</Text>
          </View>
          <View style={styles.encabezadoFila2}>
            <Text style={styles.encabezadoLabel}>
              Identificado con cédula de ciudadanía:
            </Text>
            <Text style={styles.encabezadoValue}>{data.profesionalCedula}</Text>
          </View>
          <View style={styles.encabezadoFila2}>
            <Text style={styles.encabezadoLabel}>Ciudad:</Text>
            <Text style={styles.encabezadoValue}>{data.ciudad}</Text>
          </View>

          <Text style={styles.saludo}>
            Reciba un cordial saludo. En el presente documento encontrará los
            detalles de la actividad a realizar. Si presenta alguna inquietud
            o novedad, agradecemos que nos sea informado.
          </Text>

          <View style={styles.tabla}>
            <FilaTabla
              label="N.° de orden de servicio:"
              value={data.numeroOrden}
            />
            <FilaTabla
              label="Nombre de la empresa cliente:"
              value={data.nombreEmpresaCliente}
            />
            <FilaTabla
              label="Nombre de la actividad:"
              value={data.nombreActividad}
            />
            <FilaTabla
              label="Descripción de la actividad:"
              value={data.descripcionActividad}
            />
            <FilaTabla label="N.° de horas:" value={String(data.numeroHoras)} />
            <FilaTabla
              label="Fecha de inicio de ejecución:"
              value={data.fechaEjecucionInicio}
            />
            <FilaTabla
              label="Fecha de finalización de ejecución:"
              value={data.fechaFinalizacionEjecucion}
            />
            <FilaTabla label="Dirección:" value={data.direccionEmpresaAVisitar} />
            <FilaTabla label="Hora de inicio:" value={data.horaInicioActividad} />
            <FilaTabla
              label="Hora de finalización:"
              value={data.finalizacionActividad}
            />
            <FilaTabla
              label="Persona de contacto de la empresa cliente:"
              value={data.personaContacto}
            />
            <FilaTabla
              label="Entregable estándar:"
              value={data.entregableEstandar}
            />
            <FilaTabla
              label="Entregables específicos:"
              value={data.entregablesEspecificos}
            />
            <FilaTabla
              label="Fecha máxima de entrega:"
              value={data.fechaCierreOrden}
            />
            <View style={styles.fila}>
              <Text style={styles.celdaLabel}></Text>
              <Text style={styles.celdaNota}>{NOTA_CIERRE_ORDEN}</Text>
            </View>
            <FilaTabla
              label="Profesional que emite VoBo para facturación:"
              value={data.profesionalVoBo}
            />
            <FilaTabla label="Costo de la hora:" value={data.costoHora} />
            <FilaTabla
              label="Costo total del servicio:"
              value={data.costoTotal}
            />
            <FilaTabla label="Nota:" value={NOTA_SOPORTES} />
            <FilaTabla label="Fecha de pago:" value={NOTA_FECHA_PAGO} />
            <View style={styles.filaSinBorde}>
              <Text style={styles.celdaLabel}>
                Documentos para la radicación de la factura:
              </Text>
              <View style={styles.celdaValue}>
                {DOCUMENTOS_FACTURA.map((doc, i) => (
                  <Text key={i}>
                    {i + 1}. {doc}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.parrafo}>
            Agradecemos confirmar la aceptación de la orden de servicio
            mediante correo confirmatorio. La presente orden de servicio es
            emitida desde la ciudad de Bogotá.
          </Text>

          <Text style={styles.cordialmente}>Cordialmente,</Text>

          <View style={styles.firmaFila}>
            <View style={styles.firmaBloque}>
              <Text style={styles.firmaLinea}>{GERENTE.nombre}</Text>
              <Text style={styles.firmaLinea}>C. C. {GERENTE.cedula}</Text>
              <Text style={styles.firmaLinea}>{GERENTE.cargo}</Text>
            </View>
            <View style={styles.firmaCajaWrapper}>
              <View style={styles.firmaCaja}>
                <Text style={styles.firmaCajaTexto}>
                  Firma de confirmación de aceptación del profesional
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
