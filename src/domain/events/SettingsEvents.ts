import { DomainEvent } from "./DomainEvent";

export class ThemeToggledEvent extends DomainEvent {
  readonly type = "ThemeToggled";
  constructor(public readonly isDarkMode: boolean) {
    super();
  }
}

export class SettingsChangedEvent extends DomainEvent {
  readonly type = "SettingsChanged";
  constructor(
    public readonly key: string,
    public readonly value: unknown,
  ) {
    super();
  }
}
