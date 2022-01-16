import { MidaBrokerAccount } from "#brokers/MidaBrokerAccount";
import { MidaDate } from "#dates/MidaDate";
import { MidaBrokerDeal } from "#deals/MidaBrokerDeal";
import { MidaBrokerOrderPurpose } from "#orders/MidaBrokerOrderPurpose";
import { MidaBrokerOrderRejectionType } from "#orders/MidaBrokerOrderRejectionType";
import { MidaBrokerOrderStatus } from "#orders/MidaBrokerOrderStatus";
import { MidaBrokerOrderTimeInForce } from "#orders/MidaBrokerOrderTimeInForce";
import { MidaBrokerPosition } from "#positions/MidaBrokerPosition";
import { MidaBrokerOrderDirection } from "./MidaBrokerOrderDirection";

export type MidaBrokerOrderParameters = {
    id?: string;
    brokerAccount: MidaBrokerAccount;
    symbol: string;
    requestedVolume: number;
    direction: MidaBrokerOrderDirection;
    purpose: MidaBrokerOrderPurpose;
    limitPrice?: number;
    stopPrice?: number;
    status: MidaBrokerOrderStatus;
    creationDate?: MidaDate;
    lastUpdateDate?: MidaDate;
    timeInForce: MidaBrokerOrderTimeInForce;
    deals?: MidaBrokerDeal[];
    position?: MidaBrokerPosition | (() => MidaBrokerPosition);
    rejectionType?: MidaBrokerOrderRejectionType;
    isStopOut?: boolean;
};
