// La tabla `ordenes_servicio` (y la eliminación de `estados_orden`, que no
// existe en la base real) se corrigió a mano el 2026-07-24 para que
// coincida con el schema real de Supabase — el archivo generado
// previamente asumía columnas (estado_id, asesor_gestion_riesgos_id,
// responsable_sec_id, tipo_servicio_id, tipo_servicio_nuevo) y una tabla
// (estados_orden) que nunca existieron en la base, lo que rompía
// getOrdenes() con "Could not find a relationship...". Regenerar con
// `supabase gen types typescript --project-id <id>` en cuanto el proyecto
// esté linkeado localmente para volver a la fuente generada.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklist_proceso: {
        Row: {
          cumplio_entrega_fecha: boolean | null
          entrega_soportes_cliente: boolean | null
          entrega_soportes_profesional: boolean | null
          envio_at028: boolean | null
          envio_at031: boolean | null
          estado_ejecucion_id: number | null
          fecha_maxima_ejecucion: string | null
          fecha_maxima_entrega_soportes: string | null
          formatos: boolean | null
          informe_guardian: string | null
          orden_id: number
          vobo_emitido: boolean
        }
        Insert: {
          cumplio_entrega_fecha?: boolean | null
          entrega_soportes_cliente?: boolean | null
          entrega_soportes_profesional?: boolean | null
          envio_at028?: boolean | null
          envio_at031?: boolean | null
          estado_ejecucion_id?: number | null
          fecha_maxima_ejecucion?: string | null
          fecha_maxima_entrega_soportes?: string | null
          formatos?: boolean | null
          informe_guardian?: string | null
          orden_id: number
          vobo_emitido: boolean
        }
        Update: {
          cumplio_entrega_fecha?: boolean | null
          entrega_soportes_cliente?: boolean | null
          entrega_soportes_profesional?: boolean | null
          envio_at028?: boolean | null
          envio_at031?: boolean | null
          estado_ejecucion_id?: number | null
          fecha_maxima_ejecucion?: string | null
          fecha_maxima_entrega_soportes?: string | null
          formatos?: boolean | null
          informe_guardian?: string | null
          orden_id?: number
          vobo_emitido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "checklist_proceso_estado_ejecucion_id_fkey"
            columns: ["estado_ejecucion_id"]
            isOneToOne: false
            referencedRelation: "estados_ejecucion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_proceso_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      ciudades: {
        Row: {
          departamento: string | null
          id: number
          nombre: string
        }
        Insert: {
          departamento?: string | null
          id?: number
          nombre: string
        }
        Update: {
          departamento?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean | null
          fecha_creacion: string | null
          id: number
          nit: string | null
          nombre_cliente: string
        }
        Insert: {
          activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          nit?: string | null
          nombre_cliente: string
        }
        Update: {
          activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          nit?: string | null
          nombre_cliente?: string
        }
        Relationships: []
      }
      detalle_entrega_profesional: {
        Row: {
          comentarios_valor_acordado: string | null
          entregables_especificos: string | null
          envio_os_profesional: boolean | null
          fecha_cierre_orden: string | null
          orden_id: number
          participante_arl_id: number | null
          profesional_vobo_id: number | null
          recepcion_orden_servicio: boolean | null
        }
        Insert: {
          comentarios_valor_acordado?: string | null
          entregables_especificos?: string | null
          envio_os_profesional?: boolean | null
          fecha_cierre_orden?: string | null
          orden_id: number
          participante_arl_id?: number | null
          profesional_vobo_id?: number | null
          recepcion_orden_servicio?: boolean | null
        }
        Update: {
          comentarios_valor_acordado?: string | null
          entregables_especificos?: string | null
          envio_os_profesional?: boolean | null
          fecha_cierre_orden?: string | null
          orden_id?: number
          participante_arl_id?: number | null
          profesional_vobo_id?: number | null
          recepcion_orden_servicio?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_entrega_profesional_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_entrega_profesional_participante_arl_id_fkey"
            columns: ["participante_arl_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_entrega_profesional_profesional_vobo_id_fkey"
            columns: ["profesional_vobo_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
      entregables_estandar: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      estados_ejecucion: {
        Row: {
          id: number
          nombre: string
          orden_visual: number | null
        }
        Insert: {
          id?: number
          nombre: string
          orden_visual?: number | null
        }
        Update: {
          id?: number
          nombre?: string
          orden_visual?: number | null
        }
        Relationships: []
      }
      info_orden_servicio: {
        Row: {
          actividad_reprogramada: boolean | null
          ciudad_id: number | null
          consecutivo_os_profesional: number
          contacto_cargo: string | null
          contacto_celular: string | null
          contacto_email: string | null
          contacto_nombre: string | null
          descripcion_actividad: string | null
          direccion_empresa: string | null
          empresa_a_visitar: string | null
          fecha_emision_os: string | null
          fecha_fin_ejecucion: string | null
          fecha_inicio_ejecucion: string | null
          hora_fin: string | null
          hora_inicio: string | null
          horas_asignadas: number | null
          nombre_actividad: string | null
          orden_id: number
          profesional_id: number | null
          ubicacion_google_maps: string | null
        }
        Insert: {
          actividad_reprogramada?: boolean | null
          ciudad_id?: number | null
          consecutivo_os_profesional?: number
          contacto_cargo?: string | null
          contacto_celular?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          descripcion_actividad?: string | null
          direccion_empresa?: string | null
          empresa_a_visitar?: string | null
          fecha_emision_os?: string | null
          fecha_fin_ejecucion?: string | null
          fecha_inicio_ejecucion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          horas_asignadas?: number | null
          nombre_actividad?: string | null
          orden_id: number
          profesional_id?: number | null
          ubicacion_google_maps?: string | null
        }
        Update: {
          actividad_reprogramada?: boolean | null
          ciudad_id?: number | null
          consecutivo_os_profesional?: number
          contacto_cargo?: string | null
          contacto_celular?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          descripcion_actividad?: string | null
          direccion_empresa?: string | null
          empresa_a_visitar?: string | null
          fecha_emision_os?: string | null
          fecha_fin_ejecucion?: string | null
          fecha_inicio_ejecucion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          horas_asignadas?: number | null
          nombre_actividad?: string | null
          orden_id?: number
          profesional_id?: number | null
          ubicacion_google_maps?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "info_orden_servicio_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_orden_servicio_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_orden_servicio_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_entregables_estandar: {
        Row: {
          entregable_id: number
          orden_id: number
        }
        Insert: {
          entregable_id: number
          orden_id: number
        }
        Update: {
          entregable_id?: number
          orden_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_entregables_estandar_entregable_id_fkey"
            columns: ["entregable_id"]
            isOneToOne: false
            referencedRelation: "entregables_estandar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_entregables_estandar_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_servicio: {
        Row: {
          asesor_gestion_riesgos: string | null
          cliente_id: number
          cronograma: number | null
          estado: string | null
          fecha_actualizacion: string | null
          fecha_creacion: string | null
          fecha_recepcion_os: string | null
          fecha_sipab: string | null
          horas_cargadas: number | null
          id: number
          id_unico: string | null
          link_archivo_orden: string | null
          nit_empresa_usuaria: string | null
          nombre_empresa_usuaria: string | null
          nombre_servicio: string | null
          numero_os_cliente: string | null
          observaciones_iniciales: string | null
          responsable_os: string | null
          secuencia: string | null
          tarifa_valor_transporte: string | null
          tipo_servicio: string | null
        }
        Insert: {
          asesor_gestion_riesgos?: string | null
          cliente_id: number
          cronograma?: number | null
          estado?: string | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          fecha_recepcion_os?: string | null
          fecha_sipab?: string | null
          horas_cargadas?: number | null
          id?: number
          id_unico?: string | null
          link_archivo_orden?: string | null
          nit_empresa_usuaria?: string | null
          nombre_empresa_usuaria?: string | null
          nombre_servicio?: string | null
          numero_os_cliente?: string | null
          observaciones_iniciales?: string | null
          responsable_os?: string | null
          secuencia?: string | null
          tarifa_valor_transporte?: string | null
          tipo_servicio?: string | null
        }
        Update: {
          asesor_gestion_riesgos?: string | null
          cliente_id?: number
          cronograma?: number | null
          estado?: string | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          fecha_recepcion_os?: string | null
          fecha_sipab?: string | null
          horas_cargadas?: number | null
          id?: number
          id_unico?: string | null
          link_archivo_orden?: string | null
          nit_empresa_usuaria?: string | null
          nombre_empresa_usuaria?: string | null
          nombre_servicio?: string | null
          numero_os_cliente?: string | null
          observaciones_iniciales?: string | null
          responsable_os?: string | null
          secuencia?: string | null
          tarifa_valor_transporte?: string | null
          tipo_servicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_servicio_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profesionales: {
        Row: {
          activo: boolean | null
          cedula: string | null
          email: string | null
          fecha_creacion: string | null
          id: number
          nombre_completo: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          cedula?: string | null
          email?: string | null
          fecha_creacion?: string | null
          id?: number
          nombre_completo: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          cedula?: string | null
          email?: string | null
          fecha_creacion?: string | null
          id?: number
          nombre_completo?: string
          telefono?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean | null
          email: string | null
          fecha_creacion: string | null
          id: string
          nombre_completo: string
          profesional_id: number | null
          rol: string
        }
        Insert: {
          activo?: boolean | null
          email?: string | null
          fecha_creacion?: string | null
          id: string
          nombre_completo: string
          profesional_id?: number | null
          rol: string
        }
        Update: {
          activo?: boolean | null
          email?: string | null
          fecha_creacion?: string | null
          id?: string
          nombre_completo?: string
          profesional_id?: number | null
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
      valor_hora_orden: {
        Row: {
          orden_id: number
          valor_hora_profesional: number | null
        }
        Insert: {
          orden_id: number
          valor_hora_profesional?: number | null
        }
        Update: {
          orden_id?: number
          valor_hora_profesional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "valor_hora_orden_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "ordenes_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
