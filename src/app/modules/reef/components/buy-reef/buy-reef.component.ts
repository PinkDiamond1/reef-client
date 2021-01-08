import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {IReefPricePerToken, Token, TokenBalance, TokenSymbol} from '../../../../core/models/types';
import {ApiService} from '../../../../core/services/api.service';
import {ConnectorService} from '../../../../core/services/connector.service';
import {first, map} from 'rxjs/operators';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-buy-reef',
  templateUrl: './buy-reef.component.html',
  styleUrls: ['./buy-reef.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuyReefComponent implements OnInit {
  @Input() tokenAmount = 1;
  @Input() selectedToken: string | undefined;
  @Input() tokenPrices: IReefPricePerToken | undefined;
  @Input() supportedTokens: any | undefined;
  @Input() ethPrice: number | undefined;
  @Input() loading: boolean | undefined;
  @Output() buy = new EventEmitter();
  @Output() tokenChange = new EventEmitter();
  @Output() amountChange = new EventEmitter();

  balances: Token[];

  constructor(
    public connectorService: ConnectorService,
    public apiService: ApiService,
    public changeDetectorRef: ChangeDetectorRef
  ) {
  }

  async ngOnInit(): Promise<any> {
    await this.updateTokenBalance(this.selectedToken);
  }

  private async updateTokenBalance(tokenSymbol: string, fromCache:boolean=true) {
    const info = await this.connectorService.providerUserInfo$.pipe(
      first(ev => !!ev)
    ).toPromise();
    this.balances = await this.getTokenBalances(info.address, TokenSymbol[this.selectedToken], fromCache).pipe(first()).toPromise();
    if(this.balances.length && this.balances[0].balance){
      this.tokenAmount= this.balances[0].balance;
    }
    this.changeDetectorRef.markForCheck()
  }

  onBuy(tokenAmount: number): void {
    this.buy.emit(tokenAmount);
  }

  onTokenChange(tokenSymbol: string): void {
    this.tokenChange.emit(tokenSymbol);
    this.updateTokenBalance(tokenSymbol);
  }

  onAmountChange(amount: number): void {
    this.amountChange.emit(amount);
  }

  getTokenBalances(addr: string, tokenSymbol: TokenSymbol, fromCache:boolean=true): Observable<Token[]> {
    return this.apiService.getTokenBalances(addr, fromCache).pipe(
      map(({ tokens }: TokenBalance) => {
        const tokenBalances = tokens.filter(b => {
          if (
            (this.isEthOrWeth(tokenSymbol) && this.isEthOrWeth(TokenSymbol[b.contract_ticker_symbol]))
            || TokenSymbol[b.contract_ticker_symbol] === tokenSymbol) {
            return true;
          }
          return false;
        });
        return tokenBalances && tokenBalances.length ? tokenBalances : [{
          balance: 0,
          contract_ticker_symbol: tokenSymbol
        } as Token];
      })
    );
  }

  private isEthOrWeth(tSymbol: TokenSymbol) {
    return tSymbol === TokenSymbol.ETH || tSymbol === TokenSymbol.WETH;
  }
}
