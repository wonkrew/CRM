"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function FieldMappingClient({ websiteId, formIdentifier, detectedFields, standardLeadFields, initialMappings = {} }) {
    const [mappings, setMappings] = useState(initialMappings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [customFields, setCustomFields] = useState([]);
    const [addingFieldFor, setAddingFieldFor] = useState(null);
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [pendingField, setPendingField] = useState(null);

    const allFields = [...standardLeadFields, ...customFields];

    const handleMappingChange = (detectedField, standardFieldId) => {
        if (standardFieldId === "__add_custom__") {
            setPendingField(detectedField);
            setShowDialog(true);
            setTimeout(() => {
                const input = document.getElementById(`custom-field-input-modal`);
                if (input) input.focus();
            }, 100);
            return;
        }
        setMappings(prev => ({
            ...prev,
            [detectedField]: standardFieldId,
        }));
        setSuccess(false);
    };

    const handleAddCustomField = () => {
        if (!newFieldLabel.trim() || !pendingField) return;
        const id = `custom_${Date.now()}`;
        const label = newFieldLabel.trim();
        setCustomFields(prev => [...prev, { id, label }]);
        setMappings(prev => ({
            ...prev,
            [pendingField]: id,
        }));
        setShowDialog(false);
        setAddingFieldFor(null);
        setNewFieldLabel("");
        setPendingField(null);
        setSuccess(false);
    };

    const handleDialogClose = () => {
        setShowDialog(false);
        setAddingFieldFor(null);
        setNewFieldLabel("");
        setPendingField(null);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const res = await fetch('/api/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    websiteId,
                    formIdentifier, // Use the same identifier (formId or formName)
                    mappings,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save mapping.");
            }
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Dialog open={showDialog} onOpenChange={open => { if (!open) handleDialogClose(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Field</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <input
                            id="custom-field-input-modal"
                            className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Custom field label"
                            value={newFieldLabel}
                            onChange={e => setNewFieldLabel(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") handleAddCustomField();
                                if (e.key === "Escape") handleDialogClose();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={handleAddCustomField} disabled={!newFieldLabel.trim()}>
                            Add
                        </Button>
                        <Button variant="ghost" onClick={handleDialogClose}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="space-y-4">
                {detectedFields.map(field => (
                    <div key={field} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-4 border rounded-lg bg-background">
                        {/* Detected Field */}
                        <div className="md:col-span-1">
                            <p className="font-semibold text-primary text-base">{field}</p>
                            <p className="text-xs text-muted-foreground">Incoming Field</p>
                        </div>
                        {/* Arrow Icon */}
                        <div className="hidden md:flex justify-center items-center">
                            <ArrowRight className="size-5 text-muted-foreground" />
                        </div>
                        {/* Standard Field Dropdown */}
                        <div className="md:col-span-1">
                            <Select
                                onValueChange={value => handleMappingChange(field, value)}
                                value={mappings[field] || ""}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a standard field..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allFields.filter(sf => sf.id && sf.id !== "").map(sf => (
                                        <SelectItem key={sf.id} value={sf.id}>
                                            {sf.label}
                                        </SelectItem>
                                    ))}
                                    <SelectItem key="add-custom" value="__add_custom__" className="text-primary font-semibold">
                                        + Add Custom Field
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
                {detectedFields.length === 0 && (
                     <p className="text-muted-foreground text-sm text-center py-8">No fields detected yet. Submit a form on your site to see fields appear here.</p>
                )}
            </div>
            <div className="flex justify-end items-center gap-4">
                 {success && <p className="text-sm text-green-600">Mapping saved successfully!</p>}
                 {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleSave} disabled={isLoading} className="px-6 py-2 text-base">
                    {isLoading ? "Saving..." : "Save Mapping"}
                </Button>
            </div>
        </div>
    );
} 