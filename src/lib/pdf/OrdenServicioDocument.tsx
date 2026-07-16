// Documento @react-pdf/renderer para la "Orden de Servicio" (formato GS-FIN-FT).
// Consumido por app/api/ordenes/[id]/pdf/route.tsx, que arma OrdenServicioData
// a partir de Supabase y llama a renderToBuffer(<OrdenServicioDocument data={...} />).
//
// Los textos institucionales fijos (plazo de entrega de soportes, correo de
// radicación, lista de documentos para factura, datos del gerente que firma)
// no existen en ninguna tabla de la base de datos — son constantes de este
// archivo (ver GERENTE / CORREO_RADICACION_SOPORTES / DOCUMENTOS_FACTURA más
// abajo). Reemplazarlas si cambian los datos reales de la empresa.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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

const MORADO = "#5B2A86";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  encabezadoTablaWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 14,
    color: MORADO,
  },
  fila: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 200,
    fontWeight: 700,
    color: MORADO,
  },
  value: {
    flex: 1,
  },
  notaItalica: {
    fontStyle: "italic",
    marginTop: 10,
    marginBottom: 6,
  },
  nota: {
    marginBottom: 6,
  },
  listaTitulo: {
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
  },
  listaItem: {
    marginBottom: 2,
    paddingLeft: 10,
  },
  parrafo: {
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 1.4,
  },
  firmaFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  firmaBloque: {
    width: "45%",
  },
  firmaLinea: {
    marginBottom: 2,
  },
  firmaCaja: {
    borderWidth: 1,
    borderColor: "#999",
    height: 70,
    marginTop: 4,
    padding: 4,
    justifyContent: "flex-end",
  },
});

// Datos del gerente que firma la orden — no existe tabla para esto en
// Supabase todavía, es información fija de la empresa.
const GERENTE = {
  nombre: "Gestión y Soluciones Corporativas",
  cedula: "N/A",
  cargo: "Gerente General",
};

const CORREO_RADICACION_SOPORTES = "soportes@gsc.com.co";

const DOCUMENTOS_FACTURA = [
  "Factura electrónica con los requisitos legales vigentes (DIAN).",
  "Copia de la Orden de Servicio firmada.",
  "Soportes de ejecución de la actividad (informe, registro fotográfico, listas de asistencia, según aplique).",
  "Certificación de pago de seguridad social vigente (si aplica).",
];

function FilaLabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function OrdenServicioDocument({ data }: { data: OrdenServicioData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

        <Text style={styles.titulo}>ORDEN DE SERVICIO</Text>

        <FilaLabelValue label="FECHA DE EMISIÓN" value={data.fechaEmision} />
        <FilaLabelValue
          label="Apreciado profesional"
          value={data.profesionalNombre}
        />
        <FilaLabelValue
          label="Identificado con cédula de ciudadanía"
          value={data.profesionalCedula}
        />
        <FilaLabelValue label="Ciudad" value={data.ciudad} />
        <FilaLabelValue
          label="N° DE ORDEN DE SERVICIO"
          value={data.numeroOrden}
        />
        <FilaLabelValue
          label="NOMBRE DE LA EMPRESA CLIENTE"
          value={data.nombreEmpresaCliente}
        />
        <FilaLabelValue
          label="NOMBRE DE LA ACTIVIDAD"
          value={data.nombreActividad}
        />
        <FilaLabelValue
          label="DESCRIPCIÓN DE LA ACTIVIDAD"
          value={data.descripcionActividad}
        />
        <FilaLabelValue
          label="N° DE HORAS"
          value={String(data.numeroHoras)}
        />
        <FilaLabelValue
          label="FECHA DE EJECUCIÓN INICIO"
          value={data.fechaEjecucionInicio}
        />
        <FilaLabelValue
          label="FECHA DE FINALIZACIÓN DE LA EJECUCIÓN"
          value={data.fechaFinalizacionEjecucion}
        />
        <FilaLabelValue
          label="DIRECCIÓN EMPRESA A VISITAR"
          value={data.direccionEmpresaAVisitar}
        />
        <FilaLabelValue
          label="HORA DE INICIO DE LA ACTIVIDAD"
          value={data.horaInicioActividad}
        />
        <FilaLabelValue
          label="FINALIZACIÓN DE LA ACTIVIDAD"
          value={data.finalizacionActividad}
        />
        <FilaLabelValue
          label="PERSONA DE CONTACTO EMPRESA CLIENTE"
          value={data.personaContacto}
        />
        <FilaLabelValue
          label="ENTREGABLE ESTÁNDAR"
          value={data.entregableEstandar}
        />
        <FilaLabelValue
          label="ENTREGABLES ESPECÍFICOS"
          value={data.entregablesEspecificos}
        />
        <FilaLabelValue
          label="FECHA DE CIERRE DE LA ORDEN"
          value={data.fechaCierreOrden}
        />
        <FilaLabelValue
          label="PROFESIONAL QUE EMITE VoBo"
          value={data.profesionalVoBo}
        />
        <FilaLabelValue label="COSTO DE LA HORA" value={data.costoHora} />
        <FilaLabelValue
          label="COSTO TOTAL DEL SERVICIO"
          value={data.costoTotal}
        />

        <Text style={styles.notaItalica}>
          Nota: el plazo máximo para la entrega de los soportes de ejecución
          de la actividad es de tres (3) días hábiles contados a partir de la
          fecha de finalización de la ejecución.
        </Text>

        <Text style={styles.nota}>
          Los soportes deben enviarse al correo: {CORREO_RADICACION_SOPORTES}
        </Text>

        <Text style={styles.listaTitulo}>
          Documentos para la radicación de la factura:
        </Text>
        {DOCUMENTOS_FACTURA.map((doc, i) => (
          <Text key={i} style={styles.listaItem}>
            {i + 1}. {doc}
          </Text>
        ))}

        <Text style={styles.parrafo}>
          Se confirma la presente Orden de Servicio, emitida en {data.ciudad}{" "}
          en la fecha indicada.
        </Text>

        <View style={styles.firmaFila}>
          <View style={styles.firmaBloque}>
            <Text style={styles.firmaLinea}>{GERENTE.nombre}</Text>
            <Text style={styles.firmaLinea}>C.C. {GERENTE.cedula}</Text>
            <Text style={styles.firmaLinea}>{GERENTE.cargo}</Text>
          </View>
          <View style={styles.firmaBloque}>
            <View style={styles.firmaCaja}>
              <Text>Firma Confirmación de aceptación del profesional</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
