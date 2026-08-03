// scripts/check-glb-budget.test.mjs
import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';

function countTriangles(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute('POSITION');
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0;
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

describe('countTriangles', () => {
  it('counts triangles from an indexed primitive', () => {
    const document = new Document();
    const buffer = document.createBuffer();
    const positions = document
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]))
      .setBuffer(buffer);
    const indices = document
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint16Array([0, 1, 2, 1, 2, 3]))
      .setBuffer(buffer);
    const primitive = document.createPrimitive().setAttribute('POSITION', positions).setIndices(indices);
    document.createMesh().addPrimitive(primitive);

    expect(countTriangles(document)).toBe(2);
  });
});
