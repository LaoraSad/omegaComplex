export interface Pool {
  id: string;
  name: string;
  location: string;
  description: string;
  panoramaUrl: string;   // ruta relativa a /public
  thumbnailUrl: string;
  tags: string[];
  rating: number;        // 1-5
  features: string[];
  price: number;
}
