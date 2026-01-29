FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["api.csproj", "./"]
RUN dotnet restore "api.csproj"

COPY . .
RUN dotnet build "api.csproj" -c Release -o /app/build

RUN dotnet publish "api.csproj" -c Release -o /app/publish /p:UseAppHost=false

RUN dotnet tool install --global dotnet-ef --version 9.0.0
ENV PATH="${PATH}:/root/.dotnet/tools"

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /root/.dotnet/tools /root/.dotnet/tools
ENV PATH="${PATH}:/root/.dotnet/tools"

COPY --from=build /app/publish .
COPY --from=build /src /src

COPY migrate.sh /app/migrate.sh
RUN chmod +x /app/migrate.sh

EXPOSE 8080
ENTRYPOINT ["dotnet", "api.dll"]