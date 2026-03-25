export interface IRepository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(filter: Partial<T>): Promise<boolean>;
}
