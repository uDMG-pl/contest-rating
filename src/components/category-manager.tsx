import { useState, type FormEvent } from "react"
import {
  CheckIcon,
  ListPlusIcon,
  Settings2Icon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { Category } from "@/src/lib/contest-state"

interface CategoryManagerProps {
  categories: readonly Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => void
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryId: string) => void
}

interface CategoryRowProps {
  category: Category
  categories: readonly Category[]
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryId: string) => void
}

function isDuplicateName(
  name: string,
  categories: readonly Category[],
  ignoredCategoryId?: string,
) {
  const normalizedName = name.trim().toLocaleLowerCase("pl")

  return categories.some(
    (category) =>
      category.id !== ignoredCategoryId &&
      category.name.toLocaleLowerCase("pl") === normalizedName,
  )
}

function CategoryRow({
  category,
  categories,
  onRename,
  onDelete,
}: CategoryRowProps) {
  const [name, setName] = useState(category.name)
  const [error, setError] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const normalizedName = name.trim()
  const changed = normalizedName !== category.name

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!normalizedName) {
      setError("Nazwa kategorii nie może być pusta.")
      return
    }

    if (isDuplicateName(normalizedName, categories, category.id)) {
      setError("Kategoria o tej nazwie już istnieje.")
      return
    }

    onRename(category.id, normalizedName)
    setName(normalizedName)
    setError("")
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-2">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel className="sr-only" htmlFor={`category-${category.id}`}>
            Nazwa kategorii
          </FieldLabel>
          <div className="flex items-start gap-2">
            <Input
              id={`category-${category.id}`}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError("")
              }}
              aria-invalid={error ? true : undefined}
            />
            <Button
              type="submit"
              size="icon"
              variant="outline"
              disabled={!changed}
              aria-label={`Zapisz kategorię ${category.name}`}
            >
              <CheckIcon data-icon="inline-start" />
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Usuń kategorię ${category.name}`}
                  />
                }
              >
                <Trash2Icon data-icon="inline-start" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <Trash2Icon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Usunąć kategorię?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Kategoria „{category.name}” i wszystkie przyznane w niej
                    punkty zostaną usunięte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      onDelete(category.id)
                      setDeleteOpen(false)
                    }}
                  >
                    Usuń kategorię
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
    </form>
  )
}

export function CategoryManager({
  categories,
  open,
  onOpenChange,
  onAdd,
  onRename,
  onDelete,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [error, setError] = useState("")

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = newCategoryName.trim()

    if (!normalizedName) {
      setError("Wpisz nazwę nowej kategorii.")
      return
    }

    if (isDuplicateName(normalizedName, categories)) {
      setError("Kategoria o tej nazwie już istnieje.")
      return
    }

    onAdd(normalizedName)
    setNewCategoryName("")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2Icon data-icon="inline-start" />
        <span className="hidden sm:inline">Kategorie</span>
        <span className="sm:hidden">Edytuj</span>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Zarządzaj kategoriami</DialogTitle>
          <DialogDescription>
            Zmiany obowiązują dla wszystkich zgłoszeń i zapisują się
            automatycznie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd}>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="new-category">Nowa kategoria</FieldLabel>
              <div className="flex items-start gap-2">
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(event) => {
                    setNewCategoryName(event.target.value)
                    setError("")
                  }}
                  placeholder="Np. Oryginalność wykonania"
                  aria-invalid={error ? true : undefined}
                />
                <Button type="submit">
                  <ListPlusIcon data-icon="inline-start" />
                  Dodaj
                </Button>
              </div>
              <FieldDescription>
                Oceny w nowej kategorii zaczną od 0.
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>
        </form>

        <Separator />

        {categories.length > 0 ? (
          <div className="flex flex-col gap-3">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={categories}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TagsIcon />
              </EmptyMedia>
              <EmptyTitle>Brak kategorii</EmptyTitle>
              <EmptyDescription>
                Dodaj pierwszą kategorię w formularzu powyżej.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Gotowe</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
