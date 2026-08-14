import { useState } from "react";
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FIELD_PRESETS, FIELD_TYPES, LEAD_MAPPABLE_COLUMNS, fieldTypeMeta, isAnswerable,
  parseOptions, parseVisibleWhen, type FieldType,
} from "@/lib/marketing-forms";
import { FieldEditorSheet } from "./FieldEditorSheet";
import { newId, type DraftField } from "./types";
import { cn } from "@/lib/utils";
import {
  Copy, GitBranch, GripVertical, ListPlus, Pencil, Plus, Trash2,
} from "lucide-react";

interface Props {
  formId: string;
  fields: DraftField[];
  onChange: (fields: DraftField[]) => void;
}

const emptyField = (formId: string, position: number, patch: Partial<DraftField> = {}): DraftField => ({
  id: newId(),
  form_id: formId,
  field_key: "",
  label: "",
  help_text: null,
  placeholder: null,
  section: null,
  type: "texte_court",
  options: [] as unknown as DraftField["options"],
  required: false,
  max_selections: null,
  min_value: null,
  max_value: null,
  regex_validation: null,
  default_value: null,
  maps_to: null,
  visible_when: null,
  position,
  ...patch,
});

function SortableFieldRow({
  field, index, onEdit, onDuplicate, onDelete,
}: {
  field: DraftField; index: number;
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const meta = fieldTypeMeta(field.type);
  const condition = parseVisibleWhen(field.visible_when);
  const mapped = LEAD_MAPPABLE_COLUMNS.find((c) => c.value === field.maps_to);
  const options = parseOptions(field.options);

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-3 p-3 transition-shadow",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40",
        field.type === "titre_section" && "bg-muted/50",
      )}
    >
      <button
        type="button"
        className="mt-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Déplacer le champ ${field.label || "sans titre"}`}
        {...attributes} {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{index + 1}.</span>
          <span className="truncate font-medium">{field.label || "Champ sans libellé"}</span>
          {field.required && <Badge variant="secondary" className="text-[10px]">Obligatoire</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
          {field.section && <span>· {field.section}</span>}
          {options.length > 0 && <span>· {options.length} options</span>}
          {mapped && <span>· fiche : {mapped.label}</span>}
          {condition && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <GitBranch className="h-3 w-3" /> conditionnel
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Modifier le champ">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Dupliquer le champ">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Supprimer le champ">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}

export function FieldsBuilder({ formId, fields, onChange }: Props) {
  const [editing, setEditing] = useState<DraftField | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reposition = (list: DraftField[]) => list.map((f, i) => ({ ...f, position: i }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(reposition(arrayMove(fields, from, to)));
  };

  const openEditor = (field: DraftField) => { setEditing(field); setSheetOpen(true); };

  const addField = (patch: Partial<DraftField>) => {
    const field = emptyField(formId, fields.length, patch);
    onChange(reposition([...fields, field]));
    openEditor(field);
  };

  const addPreset = (presetId: string) => {
    const p = FIELD_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    onChange(reposition([...fields, emptyField(formId, fields.length, {
      field_key: p.field_key, label: p.label, help_text: p.help_text ?? null,
      placeholder: p.placeholder ?? null, section: p.section, type: p.type,
      options: (p.options ?? []) as unknown as DraftField["options"],
      required: p.required, max_selections: p.max_selections ?? null,
      maps_to: p.maps_to ?? null,
    })]));
  };

  const saveField = (updated: DraftField) => {
    onChange(fields.map((f) => (f.id === updated.id ? updated : f)));
  };

  const duplicate = (field: DraftField) => {
    const copy: DraftField = {
      ...field, id: newId(),
      field_key: `${field.field_key}_copie`,
      label: `${field.label} (copie)`,
    };
    const idx = fields.findIndex((f) => f.id === field.id);
    const next = [...fields];
    next.splice(idx + 1, 0, copy);
    onChange(reposition(next));
  };

  const remove = (field: DraftField) => {
    const dependents = fields.filter(
      (f) => parseVisibleWhen(f.visible_when)?.field_key === field.field_key,
    );
    const cleaned = fields
      .filter((f) => f.id !== field.id)
      .map((f) => (dependents.some((d) => d.id === f.id) ? { ...f, visible_when: null } : f));
    onChange(reposition(cleaned));
  };

  const editingIndex = editing ? fields.findIndex((f) => f.id === editing.id) : -1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {fields.filter((f) => isAnswerable(f.type)).length} question(s) · glissez les cartes pour changer l'ordre
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Ajouter un champ</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-popover">
            <DropdownMenuLabel>Champs prêts à l'emploi</DropdownMenuLabel>
            {FIELD_PRESETS.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => addPreset(p.id)}>
                <ListPlus className="mr-2 h-4 w-4" /> {p.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Plus className="mr-2 h-4 w-4" /> Champ vierge
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto bg-popover">
                {FIELD_TYPES.map((t) => (
                  <DropdownMenuItem key={t.value} onClick={() => addField({ type: t.value as FieldType })}>
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="font-medium">Ce formulaire ne contient encore aucun champ</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Commencez par un champ prêt à l'emploi : entreprise, contact, échéance du projet.
          </p>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableFieldRow
                  key={field.id} field={field} index={index}
                  onEdit={() => openEditor(field)}
                  onDuplicate={() => duplicate(field)}
                  onDelete={() => remove(field)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FieldEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        field={editing}
        previousFields={editingIndex > 0 ? fields.slice(0, editingIndex) : []}
        usedKeys={fields.map((f) => f.field_key)}
        onSave={saveField}
      />
    </div>
  );
}
