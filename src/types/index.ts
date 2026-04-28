export interface MeasurementData {
  [key: string]: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  measurements?: MeasurementSession[];
}

export interface MeasurementSession {
  id: string;
  customerId: string;
  date: string;
  data: MeasurementData;
  rawTranscript: string;
}
