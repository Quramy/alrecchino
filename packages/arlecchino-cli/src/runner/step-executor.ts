import * as models from "../model";
import { sleep } from "./util";
import { ExecutionContext, StepExecutor } from "./types";
import { ElementFinder } from "./element-finder";
import { ScriptExportTypeMismatchError, NoResolvedScriptError } from "./errors";

export class DefaultStepExecutor implements StepExecutor {

  private readonly context: ExecutionContext;

  constructor(ctx: ExecutionContext) {
    this.context = ctx;
  }

  private get page() {
    return this.context.currentPage;
  }

  private get url() {
    return this.page.url();
  }

  private evalString(templateValue: models.TemplateString) {
    return this.context.evaluateValue(templateValue);
  }

  executeStep(step: models.Step) {
    const delegate = this[step.type] as (s: typeof step) => Promise<void>;
    if (delegate) {
      return delegate.call(this, step);
    }
    throw new Error("");
  }

  async screenshot(step: models.ScreenshotStep) {
    const buffer = await this.context.currentPage.screenshot({
      fullPage: step.fullPage,
    });
    const fileName = step.name ? `${this.context.evaluateValue(step.name)}.png` : "screenshot_" + this.context.counters.screenshot.getAndIncrement() + ".png";
    await this.context.resultWriter.writeBinary(buffer, fileName);
  }

  async waitForNavigation(step: models.WaitForNavigationStep) {
    await this.page.waitForNavigation({ timeout: step.timeout });
  }

  async goto(step: models.GotoStep) {
    const { baseUri } = this.context.currentConfiguration;
    const fragment = this.evalString(step.urlFragment);
    const url = baseUri ? this.evalString(baseUri) + fragment : fragment;
    await this.page.goto(url);
  }

  async find(step: models.FindStep) {
    const elementFinder = new ElementFinder(this.context, step);
    await elementFinder.runAll();
  }

  async sleep(step: models.SleepStep) {
    await sleep(step.time);
  }

  pause(step: models.PauseModel) {
    if (this.context.visible) {
      this.context.logger.log(`Type "_resume_()" and enter key in Browser Developer Tool to resume steps.`);
      return new Promise(res => {
        this.context.currentPage.exposeFunction("_resume_", () => res());
      });
    } else {
      return Promise.resolve();
    }
  }

  async reserveNextDialogAnswer(step: models.ReserveNextDialogAnswerStep) {
    this.context.currentPage.once("dialog", async dialog => {
      if (step.isAccept !== false) {
        const text = step.text ? this.context.evaluateValue(step.text) : "";
        await dialog.accept(text);
      } else {
        await dialog.dismiss();
      }
    });
  }

  async echo(step: models.EchoStep) {
    step.messages.forEach(msg => this.context.logger.log(this.evalString(msg)));
  }

  runScript(step: models.RunScriptStep) {
    const filename = this.context.evaluateFileReference(step.scriptFile);
    try {
      require.resolve(filename);
    } catch (err) {
      throw new NoResolvedScriptError(step, err.message);
    }
    const userDefinedFunction = require(filename);
    if (typeof userDefinedFunction !== "function") {
      throw new ScriptExportTypeMismatchError(step, typeof userDefinedFunction);
    }

    // Not handle user script thrown error
    return Promise.resolve().then(() => userDefinedFunction(this.context.publish()));
  }
}
