// Edition.scss
  .edition-taches {
    background-color: yellow;
    padding: $spacing-xl;
    max-width: rem(1000);
    margin: 0 auto;
    border-radius: $radius-md;

    @include respond-to(xs) {
      padding: $spacing-lg;
    }

    h1 {
      font-size: rem(32);
      margin-bottom: $spacing-md;
      text-align: center;

      @include respond-to(xs) {
        font-size: rem(24);
      }
    }

    p {
      text-align: center;
      font-size: rem(17.6);
      margin-bottom: $spacing-xl;

      @include respond-to(xs) {
        font-size: rem(15);
      }
    }

    .theme-select-zone {
      display: flex;
      justify-content: center;
      gap: $spacing-xs;
      margin-bottom: $spacing-xl;

      @include respond-to(xs) {
        flex-wrap: wrap;
      }
    }

    .categorie-card {
      background-color: $color-surface;
      border: none;
      border-radius: $radius-md;
      padding: $spacing-md;
      margin-bottom: $spacing-xl;
      box-shadow: 0 rem(4) rem(10) rgba($color-text, 0.08);

      @include respond-to(xs) {
        padding: $spacing-sm;
      }

      .categorie-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $spacing-md;

        h2 {
          font-size: rem(22);
          color: $color-primary;
          text-transform: capitalize;

          @include respond-to(xs) {
            font-size: rem(18);
          }
        }

        .toggle-btn {
          background-color: $color-primary;
          color: $color-bg;
          border: none;
          border-radius: $radius-sm;
          padding: rem(6) rem(12);
          font-weight: $font-weight-medium;
          cursor: pointer;

          @include transition-smooth;

          @include on-event {
            background-color: color.adjust($color-primary, $lightness: -10%);
            transform: scale(1.05) translateY(rem(-2));
          }

          &:active {
            transform: scale(0.97);
          }

          @include respond-to(xs) {
            padding: rem(4) rem(8);
            font-size: rem(14);
          }
        }
      }

      .liste-taches {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-md;

        .tache-item {
          display: flex;
          align-items: center;
          gap: $spacing-sm;
          padding: $spacing-sm $spacing-md;
          border-radius: $radius-sm;
          background-color: var(--pastel-color);
          box-shadow: 0 rem(2) rem(8) rgba($color-text, 0.06);
          font-weight: $font-weight-medium;
          cursor: pointer;
          flex: 1 1 rem(250);
          min-width: rem(200);

          @include transition-smooth;

          &:hover {
            transform: translateY(rem(-2)) scale(1.02);
            box-shadow: 0 rem(6) rem(12) rgba($color-text, 0.1);
          }

          &.active {
            background-color: $color-info;
            border: rem(2) solid $color-info-primary;
          }

          &.checked-anim {
            animation: pop 0.25s ease;
          }

          input[type='checkbox'] {
            transform: scale(1.3);
            cursor: pointer;
            accent-color: $color-info-primary;
          }

          img.tache-icon {
            width: rem(32);
            height: rem(32);
            object-fit: contain;
            flex-shrink: 0;

            @include respond-to(xs) {
              width: rem(24);
              height: rem(24);
            }
          }

          span {
            font-size: $font-size-base;
            line-height: 1.2;
            flex: 1;
            white-space: normal;

            @include respond-to(xs) {
              font-size: rem(14);
            }
          }
        }
      }
    }

    .reset-all-zone {
      display: flex;
      justify-content: center;
      margin-top: $spacing-xl;

      .reset-btn {
        @extend .reset;
      }
    }
  }
-------------------
