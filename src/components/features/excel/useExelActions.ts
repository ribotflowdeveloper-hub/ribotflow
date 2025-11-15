// @/app/[locale]/(app)/excel/hooks/useExcelActions.ts
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FilePlus2, Upload } from "lucide-react";

// 💡 CORRECCIÓ: Apuntem al nou fitxer de tipus
import { type DropdownOption } from "./types";
import { exportToExcel, importFromExcel } from "./actions";
import { type UsageCheckResult } from "@/lib/subscription/subscription";

/**
 * Propietats per al hook useExcelActions.
 */
interface UseExcelActionsProps {
    tableName: string;
    limitStatus: UsageCheckResult | null;
    translationKeys: {
        create: string;
        load: string;
        download: string;
        limit: string;
    };
}

/**
 * Un hook personalitzat que encapsula tota la lògica
 * per als botons d'importar/exportar d'Excel.
 */
export const useExcelActions = ({
    tableName,
    limitStatus,
    translationKeys,
}: UseExcelActionsProps) => {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const t_excel = useTranslations("excel");
    const t_billing_modal = useTranslations("Shared.limits");
    const t_billing_limit = useTranslations("Shared.limits");

    const isLimitExceeded = limitStatus && !limitStatus.allowed;

    // 1. Opcions del desplegable
    const excelOptions: DropdownOption[] = [
        {
            value: "create",
            label: t_excel(translationKeys.create),
            icon: FilePlus2,
        },
        { value: "load", label: t_excel(translationKeys.load), icon: Upload },
        {
            value: "download",
            label: t_excel(translationKeys.download),
            icon: Download,
        },
    ];

    // 2. Lògica d'Exportació
    async function handleExportAndDownload(shouldDownload: boolean) {
        toast.info(t_excel("startingexport"));
        try {
            const result = await exportToExcel(tableName, shouldDownload);
            if (result.success && result.fileBuffer) {
                const byteCharacters = atob(result.fileBuffer);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {
                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = result.fileName || "export.xlsx";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(t_excel("successexport"));
            } else {
                toast.error(t_excel("errorexport"), {
                    description: result.message,
                });
            }
        } catch (error) {
            toast.error(t_excel("unexpectederror"), {
                description: (error as Error).message,
            });
            console.error(error);
        }
    }

    // 3. Lògica d'Importació
    function handleImport() {
        if (isLimitExceeded) {
            toast.error(t_billing_modal("modalTitle"), {
                description: limitStatus?.error ||
                    t_billing_limit(translationKeys.limit, {
                        current: limitStatus?.current ?? 0,
                        max: limitStatus?.max ?? 0,
                    }),
            });
            return;
        }

        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx, .xls, .csv";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                toast.error(t_excel("nofileselected"));
                return;
            }
            toast.info(t_excel("processingfile"));
            const formData = new FormData();
            formData.append("file", file);
            startTransition(async () => {
                try {
                    const result = await importFromExcel(tableName, formData);
                    if (result.success) {
                        toast.success(result.message);
                        router.refresh();
                    } else {
                        toast.error(t_excel("errorloadingdata"), {
                            description: result.message,
                        });
                    }
                } catch (error) {
                    toast.error(t_excel("unexpectederrorloadingfile"), {
                        description: (error as Error).message,
                    });
                }
            });
        };
        input.click();
    }

    // 4. Gestor principal
    const handleExcelAction = (option: DropdownOption) => {
        switch (option.value) {
            case "download":
                startTransition(() => handleExportAndDownload(true));
                break;
            case "create":
                startTransition(() => handleExportAndDownload(false));
                break;
            case "load":
                handleImport();
                break;
        }
    };

    // 5. Retornem els elements
    return {
        isPending,
        excelOptions,
        handleExcelAction,
    };
};
