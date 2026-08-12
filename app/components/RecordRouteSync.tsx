"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseRecordId,
  recordIdQueryKey,
  type RecordSource,
} from "../lib/record-links";

type RecordRouteSyncProps = {
  source: RecordSource;
  onSelect: (recordId: number | null) => void;
};

export default function RecordRouteSync({ source, onSelect }: RecordRouteSyncProps) {
  const searchParams = useSearchParams();
  const recordId = parseRecordId(searchParams.get(recordIdQueryKey[source]));

  useEffect(() => {
    onSelect(recordId);
  }, [onSelect, recordId]);

  return null;
}
