import { MidaExpertAdvisorComponent } from "#advisors/MidaExpertAdvisorComponent";
import { MidaExpertAdvisorParameters } from "#advisors/MidaExpertAdvisorParameters";
import { MidaBrokerAccount } from "#brokers/MidaBrokerAccount";
import { MidaBrokerDeal } from "#deals/MidaBrokerDeal";
import { MidaEvent } from "#events/MidaEvent";
import { MidaEventListener } from "#events/MidaEventListener";
import { MidaBrokerOrder } from "#orders/MidaBrokerOrder";
import { MidaBrokerOrderDirectives } from "#orders/MidaBrokerOrderDirectives";
import { MidaBrokerOrderStatus } from "#orders/MidaBrokerOrderStatus";
import { MidaSymbolPeriod } from "#periods/MidaSymbolPeriod";
import { MidaBrokerPosition } from "#positions/MidaBrokerPosition";
import { MidaBrokerPositionStatus } from "#positions/MidaBrokerPositionStatus";
import { MidaSymbolTick } from "#ticks/MidaSymbolTick";
import { MidaEmitter } from "#utilities/emitters/MidaEmitter";
import { GenericObject } from "#utilities/GenericObject";
import { MidaMarketWatcher } from "#watcher/MidaMarketWatcher";

export abstract class MidaExpertAdvisor {
    readonly #brokerAccount: MidaBrokerAccount;
    #isOperative: boolean;
    readonly #orders: MidaBrokerOrder[];
    readonly #capturedTicks: MidaSymbolTick[];
    readonly #tickEventQueue: MidaSymbolTick[];
    #isTickEventLocked: boolean;
    #isConfigured: boolean;
    readonly #marketWatcher: MidaMarketWatcher;
    readonly #components: MidaExpertAdvisorComponent[];
    readonly #emitter: MidaEmitter;

    protected constructor ({ brokerAccount, }: MidaExpertAdvisorParameters) {
        this.#brokerAccount = brokerAccount;
        this.#isOperative = false;
        this.#orders = [];
        this.#capturedTicks = [];
        this.#tickEventQueue = [];
        this.#isTickEventLocked = false;
        this.#isConfigured = false;
        this.#marketWatcher = new MidaMarketWatcher({ brokerAccount, });
        this.#components = [];
        this.#emitter = new MidaEmitter();
    }

    public get brokerAccount (): MidaBrokerAccount {
        return this.#brokerAccount;
    }

    public get isOperative (): boolean {
        return this.#isOperative;
    }

    public get orders (): MidaBrokerOrder[] {
        return [ ...this.#orders, ];
    }

    protected get capturedTicks (): MidaSymbolTick[] {
        return [ ...this.#capturedTicks, ];
    }

    protected get marketWatcher (): MidaMarketWatcher {
        return this.#marketWatcher;
    }

    public get components (): MidaExpertAdvisorComponent[] {
        return [ ...this.#components, ];
    }

    public get enabledComponents (): MidaExpertAdvisorComponent[] {
        const enabledComponents: MidaExpertAdvisorComponent[] = [];

        for (const component of this.#components) {
            if (component.enabled) {
                enabledComponents.push(component);
            }
        }

        return enabledComponents;
    }

    public get filledOrders (): MidaBrokerOrder[] {
        const filledOrders: MidaBrokerOrder[] = [];

        for (const order of this.#orders) {
            if (order.status === MidaBrokerOrderStatus.FILLED) {
                filledOrders.push(order);
            }
        }

        return filledOrders;
    }

    public get filledOrdersDeals (): MidaBrokerDeal[] {
        const deals: MidaBrokerDeal[] = [];

        for (const order of this.filledOrders) {
            deals.push(...order.deals);
        }

        return deals;
    }

    public get positions (): MidaBrokerPosition[] {
        const positions: Map<string, MidaBrokerPosition> = new Map();

        for (const order of this.filledOrders) {
            const position: MidaBrokerPosition = order.position as MidaBrokerPosition;

            positions.set(position.id, position);
        }

        return [ ...positions.values(), ];
    }

    public get openPositions (): MidaBrokerPosition[] {
        const positions: MidaBrokerPosition[] = this.positions;
        const openPositions: MidaBrokerPosition[] = [];

        for (const position of positions) {
            if (position.status === MidaBrokerPositionStatus.OPEN) {
                openPositions.push(position);
            }
        }

        return openPositions;
    }

    public async start (): Promise<void> {
        if (this.#isOperative) {
            return;
        }

        if (!this.#isConfigured) {
            await this.#configure();

            this.#isConfigured = true;
        }

        this.#isOperative = true;

        try {
            await this.onStart();
        }
        catch (error) {
            console.log(error);

            return;
        }

        this.notifyListeners("start");
    }

    public async stop (): Promise<void> {
        if (!this.#isOperative) {
            return;
        }

        this.#isOperative = false;

        try {
            await this.onStop();

            return;
        }
        catch (error) {
            console.log(error);
        }

        this.notifyListeners("stop");
    }

    public on (type: string): Promise<MidaEvent>
    public on (type: string, listener: MidaEventListener): string
    public on (type: string, listener?: MidaEventListener): Promise<MidaEvent> | string {
        if (!listener) {
            return this.#emitter.on(type);
        }

        return this.#emitter.on(type, listener);
    }

    public removeEventListener (uuid: string): void {
        this.#emitter.removeEventListener(uuid);
    }

    protected abstract configure (): Promise<void>;

    protected async onStart (): Promise<void> {
        // Silence is golden.
    }

    protected async onTick (tick: MidaSymbolTick): Promise<void> {
        // Silence is golden.
    }

    protected async onPeriodClose (period: MidaSymbolPeriod): Promise<void> {
        // Silence is golden.
    }

    protected async onStop (): Promise<void> {
        // Silence is golden.
    }

    protected async placeOrder (directives: MidaBrokerOrderDirectives): Promise<MidaBrokerOrder> {
        const order: MidaBrokerOrder = await this.#brokerAccount.placeOrder(directives);

        this.addOrder(order);

        return order;
    }

    protected addOrder (order: MidaBrokerOrder): void {
        // Silence is golden.
    }

    protected notifyListeners (type: string, descriptor?: GenericObject): void {
        this.#emitter.notifyListeners(type, descriptor);
    }

    #onTick (tick: MidaSymbolTick): void {
        if (!this.#isOperative) {
            return;
        }

        this.#capturedTicks.push(tick);
        this.#onTickAsync(tick);
    }

    async #onTickAsync (tick: MidaSymbolTick): Promise<void> {
        if (this.#isTickEventLocked) {
            this.#tickEventQueue.push(tick);
        }

        this.#isTickEventLocked = true;

        // <components>
        for (const component of this.enabledComponents) {
            try {
                await component.onTick(tick);
            }
            catch (error) {
                console.error(error);
            }
        }

        for (const component of this.enabledComponents) {
            try {
                await component.onLateTick(tick);
            }
            catch (error) {
                console.error(error);
            }
        }
        // </components>

        try {
            await this.onTick(tick);
        }
        catch (error) {
            console.error(error);
        }

        const nextTick: MidaSymbolTick | undefined = this.#tickEventQueue.shift();
        this.#isTickEventLocked = false;

        if (nextTick) {
            this.#onTickAsync(nextTick);
        }
    }

    #onPeriodClose (period: MidaSymbolPeriod): void {
        try {
            this.onPeriodClose(period);
        }
        catch (error) {
            console.log(error);
        }
    }

    async #configure (): Promise<void> {
        for (const component of this.enabledComponents) {
            try {
                await component.configure();
            }
            catch (error) {
                console.log(error);
            }
        }

        try {
            await this.configure();
        }
        catch (error) {
            console.log(error);
        }

        this.#configureListeners();
    }

    #configureListeners (): void {
        this.#marketWatcher.on("tick", (event: MidaEvent): void => this.#onTick(event.descriptor.tick));
        this.#marketWatcher.on("period-close", (event: MidaEvent): void => this.#onPeriodClose(event.descriptor.period));
    }
}
