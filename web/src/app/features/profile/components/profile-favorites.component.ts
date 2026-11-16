import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArticleListComponent } from '../../article/components/article-list.component';
import { ProfileService } from '../services/profile.service';
import { Profile } from '../models/profile.model';
import { ArticleListConfig } from '../../article/models/article-list-config.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-profile-favorites',
  template: `@if (favoritesConfig()) {
    <app-article-list
      [limit]="10"
      [config]="favoritesConfig()!"
      [currentPage]="currentPage()"
      (pageChange)="onPageChange($event)"
    />
  }`,
  imports: [ArticleListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfileFavoritesComponent implements OnInit {
  profile = signal<Profile | null>(null);
  favoritesConfig = signal<ArticleListConfig | null>(null);
  currentPage = signal(1);
  destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private readonly router: Router,
    private readonly profileService: ProfileService,
  ) {}

  ngOnInit() {
    // The page lives in the address, as on the home page: /profile/<user>/favorites?page=2, and no page for page 1.
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(queryParams => {
      this.currentPage.set(queryParams['page'] ? parseInt(queryParams['page'], 10) : 1);
    });

    this.profileService
      .get(this.route.parent?.snapshot.params['username'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile: Profile) => {
          this.profile.set(profile);
          this.favoritesConfig.set({
            type: 'all',
            filters: {
              favorited: profile.username,
            },
          });
        },
      });
  }

  onPageChange(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: page > 1 ? { page } : {},
    });
  }
}
