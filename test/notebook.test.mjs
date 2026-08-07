import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { ACTOR, formNotebookBindingCandidate, notebookIdentity } from "../src/notebook.mjs";
import { CHANNEL, PROVIDER, VIDEO_CAPACITY_ALLOCATION, contentId, digest, formVideoDemand, nextPendingLesson, providerBinding, validLesson } from "../src/operations.mjs";

const AT = "2026-07-22T12:00:00.000Z";
async function lessonProduct() {
  const dataRoot = resolve(import.meta.dirname, "../../artificial-intelligence-curriculum-enterprise/data");
  const rows = (await querySettlementRecords("artificial-intelligence-curriculum.lesson-product-admission")).sort((left, right) => left.sequence - right.sequence);
  assert.ok(rows.length >= 1);
  return rows[0];
}
function exact(body) { return { id: contentId(body), ...body }; }

test("AI/ML notebook identity is bound while effects remain separately gated", () => { const identity = notebookIdentity(); assert.equal(identity.actor, ACTOR); assert.equal(identity.notebookId, "9c3eed44-7fa3-4203-8b79-e0a20b91017f"); assert.match(identity.creationReceipt, /^urn:sha256:/u); const candidate = formNotebookBindingCandidate(identity.url); assert.equal(candidate.notebookId, identity.notebookId); assert.deepEqual(candidate.authorityGranted, []); assert.throws(() => formNotebookBindingCandidate("https://example.com/notebook/67510ce7-79b3-4caa-b25c-28e0d3911b5a"), /exact NotebookLM/u); });

test("standing provider binding is exact", () => {
  const binding = providerBinding();
  assert.equal(binding.customer, ACTOR);
  assert.equal(binding.provider, PROVIDER);
  assert.equal(binding.videoCustomer, CHANNEL);
  assert.equal(binding.videoCapacityAllocation, VIDEO_CAPACITY_ALLOCATION);
});

test("the admitted curriculum product crosses the boundary as fresh path-free bytes", () => {
  const lesson = lessonProduct();
  assert.equal(validLesson(lesson, AT), true);
  assert.equal(validLesson(lesson, "2037-01-01T00:00:00.000Z"), false);
  assert.equal(Buffer.from(lesson.source.bytes).length, lesson.source.byteLength);
  assert.equal(digest(Buffer.from(lesson.source.bytes)), lesson.source.digest);
  assert.equal(Object.hasOwn(lesson.source, "path"), false);
});

test("video demand deterministically binds the curriculum, source receipt, and alternating explainer allocation", () => {
  const lesson = lessonProduct();
  const sourceBody = { type: "ArtificialIntelligenceNotebookSourceStateAdmission", notebook: `urn:emsenn:notebooklm-notebook:${notebookIdentity().notebookId}`, curriculumProduct: lesson.id, sourcePacket: lesson.sourcePacket, sourceDigest: lesson.source.digest, provider: PROVIDER, providerOperation: `urn:sha256:${"1".repeat(64)}`, providerRequestDigest: `sha256:${"2".repeat(64)}`, providerReceipt: `urn:sha256:${"3".repeat(64)}`, desiredSources: [{ title: lesson.source.title, digest: lesson.source.digest, mediaType: lesson.source.mediaType, byteLength: lesson.source.byteLength }], finalSourceIds: ["source-id"], finalSourceSetDigest: `sha256:${"4".repeat(64)}`, admittedAt: AT };
  const sourceAdmission = exact(sourceBody), demand = formVideoDemand(lesson, sourceAdmission, AT);
  assert.equal(demand.customer, CHANNEL);
  assert.equal(demand.provider, PROVIDER);
  assert.equal(demand.sourceAdmission, sourceAdmission.id);
  assert.equal(demand.providerRequest.notebookSourceReceiptId, sourceAdmission.providerReceipt);
  assert.equal(demand.providerRequest.videoFormat, "explainer");
  assert.equal(demand.providerRequest.videoCapacityAllocation, VIDEO_CAPACITY_ALLOCATION);
  assert.equal(demand.id, contentId(Object.fromEntries(Object.entries(demand).filter(([key]) => key !== "id"))));
});

test("the notebook runner advances over an ordered curriculum instead of hard-coding lesson one", () => {
  const first = lessonProduct();
  assert.equal(nextPendingLesson([first], [], AT).id, first.id);
  assert.equal(nextPendingLesson([first], [{ curriculumProduct: first.id }], AT), null);
});
