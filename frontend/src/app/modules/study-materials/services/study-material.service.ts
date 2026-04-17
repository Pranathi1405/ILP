// Author: Poojitha

import { Injectable } from '@angular/core';
import { Content } from '../models/content.model';

@Injectable({
  providedIn: 'root'
})
export class StudyMaterialService {

   private contents: Content[] = [];
  modules = [
{
  id: 1,
  name: "Mechanics",
  topics: [
    {
      id: 1,
      name: "Kinematics",
      content: "<p>Kinematics is the study of motion... </p>"
    },
    {
      id: 2,
      name: "Laws of Motion",
      content: `
      <h1>Kinematics</h1>
      <p>Kinematics is a branch of physics that studies the motion of objects without considering the forces that cause the motion.</p>

      <h2>Basic Concepts</h2>
      <p><strong>Displacement:</strong> The change in position of an object.</p>
      <p><strong>Velocity:</strong> The rate of change of displacement with time.</p>
      <p><strong>Acceleration:</strong> The rate of change of velocity with time.</p>

      <h2>Equations of Motion</h2>
      <ul>
        <li>v = u + at</li>
        <li>s = ut + ½at²</li>
        <li>v² = u² + 2as</li>
      </ul>

      <p>These equations are useful for describing motion with constant acceleration.</p>

      <p>Example: When a car starts from rest and accelerates uniformly, we can calculate its velocity and displacement using these equations.</p>
       <p>Velocity describes both the speed and direction of motion.</p>
  <p>Acceleration represents how quickly the velocity of an object changes over time.</p>
  <p>Objects moving with constant acceleration follow a predictable pattern of motion.</p>
  <p>These patterns can be described using mathematical equations known as the equations of motion.</p>
  <p>Kinematics is widely used in engineering, robotics, transportation systems, and space science.</p>
      `
    }
  ]
}
]

getModuleById(id:number){
  return this.modules.find(m => m.id === id);
}

  //return all contents (for listing, editing, etc.)
   getAll() {
    return this.contents;
   
  }

  // save or update content
  save(content: Content) {
    const index = this.contents.findIndex(c => c.id === content.id);

    if (index > -1) {
      this.contents[index] = content;
    } else {
      this.contents.push(content);
    }
  }

  // publish content
  publish(id: string) {
    const item = this.contents.find(c => c.id === id);
    if (item) {
      item.status = 'PUBLISHED';
    }
  }
}
