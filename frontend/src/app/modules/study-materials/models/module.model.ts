import { Topic } from "./topic.model";

export interface Module {
  id: number;
  name: string;
  topics: Topic[];
}
