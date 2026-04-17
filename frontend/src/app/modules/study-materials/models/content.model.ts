// Author: Poojitha

export type ContentStatus = 'DRAFT' | 'PUBLISHED';

export interface Content {
  id: string;
  title: string;
  content: string;
  type: 'EDITOR' | 'PDF';
  status: ContentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
