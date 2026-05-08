export type Event = {
  id: string;
  name: string;
  region: string;
  bbox: [number, number, number, number];
  center: [number, number];
  date_before: string;
  date_after: string;
  area_total_ha: number;
  area_loss_ha: number;
  ndvi_drop_mean: number;
  ndvi_before_mean: number;
  ndvi_after_mean: number;
  confidence: number;
  assets: {
    before: string;
    after: string;
    mask: string;
  };
};

export type EventsFile = {
  generated_at: string;
  count: number;
  events: Event[];
};
