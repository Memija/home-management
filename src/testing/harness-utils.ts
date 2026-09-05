import { ComponentFixture } from '@angular/core/testing';
import { ComponentHarness, ComponentHarnessConstructor } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

/**
 * Creates a component harness for the root element of a fixture
 */
export async function getHarness<T extends ComponentHarness>(
  fixture: ComponentFixture<unknown>,
  harnessType: ComponentHarnessConstructor<T>,
): Promise<T> {
  return TestbedHarnessEnvironment.harnessForFixture(fixture, harnessType);
}

/**
 * Creates a harness loader rooted at the fixture's root element
 */
export function getHarnessLoader(fixture: ComponentFixture<unknown>) {
  return TestbedHarnessEnvironment.loader(fixture);
}
