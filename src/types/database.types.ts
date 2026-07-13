// Tipos de la base de datos Supabase.
//
// Este archivo refleja el esquema SQL acordado en el Plan MVP (clientes,
// profesionales, estados_orden, ordenes_servicio). Persona A debe
// reemplazarlo por el output real de:
//   supabase gen types typescript --project-id <id> > src/types/database.types.ts
// una vez el proyecto de Supabase exista, para que quede sincronizado con el
// esquema real (incluyendo cualquier ajuste que salga de validar contra el
// Excel el Día 1).
//
// `Relationships: []` y `Views`/`Functions: {}` son obligatorios aunque estén
// vacíos: el cliente tipado de @supabase/supabase-js (GenericSchema /
// GenericTable en postgrest-js) los exige estructuralmente — sin ellos,
// TypeScript no logra resolver los tipos de `.insert()`/`.update()` y los
// colapsa silenciosamente a `never`.

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: number;
          nombre_cliente: string;
          nit: string | null;
          activo: boolean;
          fecha_creacion: string;
        };
        Insert: {
          id?: number;
          nombre_cliente: string;
          nit?: string | null;
          activo?: boolean;
          fecha_creacion?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
        Relationships: [];
      };
      profesionales: {
        Row: {
          id: number;
          nombre_completo: string;
          cedula: string | null;
          email: string | null;
          telefono: string | null;
          activo: boolean;
          fecha_creacion: string;
        };
        Insert: {
          id?: number;
          nombre_completo: string;
          cedula?: string | null;
          email?: string | null;
          telefono?: string | null;
          activo?: boolean;
          fecha_creacion?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["profesionales"]["Insert"]
        >;
        Relationships: [];
      };
      estados_orden: {
        Row: {
          id: number;
          nombre: string;
          orden_visual: number | null;
          activo: boolean;
        };
        Insert: {
          id?: number;
          nombre: string;
          orden_visual?: number | null;
          activo?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["estados_orden"]["Insert"]
        >;
        Relationships: [];
      };
      ordenes_servicio: {
        Row: {
          id: number;
          cliente_id: number;
          id_unico: string | null;
          estado_id: number | null;
          numero_os_cliente: string | null;
          fecha_recepcion_os: string | null;
          nombre_empresa_usuaria: string | null;
          nit_empresa_usuaria: string | null;
          cronograma: string | null;
          secuencia: string | null;
          nombre_servicio: string | null;
          horas_cargadas: number | null;
          tipo_servicio: string | null;
          fecha_sipab: string | null;
          asesor_gestion_riesgos_id: number | null;
          observaciones_iniciales: string | null;
          tarifa_valor_transporte: number | null;
          responsable_sec_id: number | null;
          link: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
        };
        Insert: {
          id?: number;
          cliente_id: number;
          id_unico?: string | null;
          estado_id?: number | null;
          numero_os_cliente?: string | null;
          fecha_recepcion_os?: string | null;
          nombre_empresa_usuaria?: string | null;
          nit_empresa_usuaria?: string | null;
          cronograma?: string | null;
          secuencia?: string | null;
          nombre_servicio?: string | null;
          horas_cargadas?: number | null;
          tipo_servicio?: string | null;
          fecha_sipab?: string | null;
          asesor_gestion_riesgos_id?: number | null;
          observaciones_iniciales?: string | null;
          tarifa_valor_transporte?: number | null;
          responsable_sec_id?: number | null;
          link?: string | null;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ordenes_servicio"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "ordenes_servicio_cliente_id_fkey";
            columns: ["cliente_id"];
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordenes_servicio_estado_id_fkey";
            columns: ["estado_id"];
            referencedRelation: "estados_orden";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordenes_servicio_asesor_gestion_riesgos_id_fkey";
            columns: ["asesor_gestion_riesgos_id"];
            referencedRelation: "profesionales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordenes_servicio_responsable_sec_id_fkey";
            columns: ["responsable_sec_id"];
            referencedRelation: "profesionales";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
